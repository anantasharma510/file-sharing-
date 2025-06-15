import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { connectToDatabase } from "@/lib/mongodb"
import { rateLimit } from "@/lib/rate-limit"
import { validateNetworkId, validateFile } from "@/lib/validation"

// Vercel Free Plan Optimized Limits
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const MAX_NETWORK_STORAGE = 50 * 1024 * 1024 // 50MB per network
const MAX_ITEMS_PER_NETWORK = 25
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "text/plain", "application/pdf"]

export async function POST(request: NextRequest) {
  try {
    // More restrictive rate limiting for free plan
    const rateLimitResult = await rateLimit(request, { maxRequests: 3, windowMs: 60000 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many upload requests. Please wait before uploading again." },
        { status: 429 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const networkId = formData.get("networkId") as string

    // Validation
    if (!file) {
      return NextResponse.json({ success: false, error: "File is required" }, { status: 400 })
    }

    if (!networkId || !validateNetworkId(networkId)) {
      return NextResponse.json({ success: false, error: "Valid network ID required" }, { status: 400 })
    }

    // File validation
    const fileValidation = validateFile(file, MAX_FILE_SIZE, ALLOWED_MIME_TYPES)
    if (!fileValidation.isValid) {
      return NextResponse.json({ success: false, error: fileValidation.error }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check network storage limits (stricter for free plan)
    const networkStats = await db
      .collection("shared_items")
      .aggregate([
        { $match: { networkId, expiresAt: { $gt: new Date() } } },
        { $group: { _id: null, totalSize: { $sum: "$fileSize" }, count: { $sum: 1 } } },
      ])
      .toArray()

    const currentStats = networkStats[0] || { totalSize: 0, count: 0 }

    if (currentStats.totalSize + file.size >= MAX_NETWORK_STORAGE) {
      return NextResponse.json(
        {
          success: false,
          error: `Network storage limit would be exceeded. Current: ${Math.round(
            currentStats.totalSize / 1024 / 1024,
          )}MB, Limit: ${MAX_NETWORK_STORAGE / 1024 / 1024}MB`,
        },
        { status: 413 },
      )
    }

    if (currentStats.count >= MAX_ITEMS_PER_NETWORK) {
      return NextResponse.json(
        { success: false, error: `Network item limit reached (${MAX_ITEMS_PER_NETWORK} items max)` },
        { status: 413 },
      )
    }

    // Generate secure filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 10) // Shorter for free plan
    const secureFilename = `${networkId.substring(0, 8)}/${timestamp}_${randomSuffix}_${file.name}`

    // Upload to Vercel Blob
    const blob = await put(secureFilename, file, {
      access: "public",
      addRandomSuffix: false,
    })

    // Create item record
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const item = {
      type: "file",
      content: blob.url, // Store Vercel Blob URL
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      networkId,
      createdAt: now,
      expiresAt,
      downloadCount: 0,
      blobUrl: blob.url,
    }

    await db.collection("shared_items").insertOne(item)

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        storageUsed: currentStats.totalSize + file.size,
        itemCount: currentStats.count + 1,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 },
    )
  }
}
