import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { rateLimit } from "@/lib/rate-limit"
import { validateNetworkId, sanitizeInput } from "@/lib/validation"

const MAX_TEXT_LENGTH = 5000 // Reduced for free plan
const MAX_ITEMS_PER_NETWORK = 25

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const networkId = searchParams.get("networkId")

    if (!networkId || !validateNetworkId(networkId)) {
      return NextResponse.json({ success: false, error: "Valid network ID required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Get items for this network, sorted by creation date (limit for free plan)
    const items = await db
      .collection("shared_items")
      .find({
        networkId,
        expiresAt: { $gt: new Date() }, // Only non-expired items
      })
      .sort({ createdAt: -1 })
      .limit(50) // Reduced limit for free plan
      .toArray()

    return NextResponse.json({
      success: true,
      data: { items },
    })
  } catch (error) {
    console.error("Items GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch items",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, { maxRequests: 5, windowMs: 60000 })
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    const body = await request.json()
    const { type, content, networkId } = body

    // Validation
    if (!networkId || !validateNetworkId(networkId)) {
      return NextResponse.json({ success: false, error: "Valid network ID required" }, { status: 400 })
    }

    if (!type || !["text", "file"].includes(type)) {
      return NextResponse.json({ success: false, error: "Valid type required (text or file)" }, { status: 400 })
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Content required" }, { status: 400 })
    }

    // Sanitize and validate content
    const sanitizedContent = sanitizeInput(content)
    if (type === "text" && sanitizedContent.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Text content too long (max ${MAX_TEXT_LENGTH} characters)` },
        { status: 400 },
      )
    }

    const { db } = await connectToDatabase()

    // Check network item limits
    const itemCount = await db.collection("shared_items").countDocuments({
      networkId,
      expiresAt: { $gt: new Date() },
    })

    if (itemCount >= MAX_ITEMS_PER_NETWORK) {
      return NextResponse.json(
        { success: false, error: `Network item limit reached (${MAX_ITEMS_PER_NETWORK} items max)` },
        { status: 413 },
      )
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const item = {
      type,
      content: sanitizedContent,
      networkId,
      createdAt: now,
      expiresAt,
      downloadCount: 0,
      ...(type === "text" && { textLength: sanitizedContent.length }),
    }

    const result = await db.collection("shared_items").insertOne(item)

    return NextResponse.json({
      success: true,
      data: { itemId: result.insertedId.toString() },
      message: "Item shared successfully",
    })
  } catch (error) {
    console.error("Items POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create item",
      },
      { status: 500 },
    )
  }
}
