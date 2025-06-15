import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { rateLimit } from "@/lib/rate-limit"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rateLimitResult = await rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "Invalid item ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const result = await db.collection("shared_items").deleteOne({
      _id: new ObjectId(params.id),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Item deleted successfully",
    })
  } catch (error) {
    console.error("Delete item error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete item",
      },
      { status: 500 },
    )
  }
}
