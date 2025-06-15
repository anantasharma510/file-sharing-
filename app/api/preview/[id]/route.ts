import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rateLimitResult = await rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "Invalid item ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Get item details
    const item = await db.collection("shared_items").findOne({
      _id: new ObjectId(params.id),
      type: "file",
      expiresAt: { $gt: new Date() },
    })

    if (!item) {
      return NextResponse.json({ success: false, error: "File not found or expired" }, { status: 404 })
    }

    // Only allow preview for images
    if (!item.mimeType?.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Preview not available for this file type" }, { status: 400 })
    }

    // For Vercel Blob, redirect to the blob URL
    if (item.blobUrl) {
      return NextResponse.redirect(item.blobUrl)
    }

    return NextResponse.json({ success: false, error: "Preview URL not found" }, { status: 404 })
  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json({ success: false, error: "Failed to load preview" }, { status: 500 })
  }
}
