import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "Invalid item ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Increment download count
    await db.collection("shared_items").updateOne({ _id: new ObjectId(params.id) }, { $inc: { downloadCount: 1 } })

    return NextResponse.json({
      success: true,
      message: "Download tracked",
    })
  } catch (error) {
    console.error("Track download error:", error)
    return NextResponse.json({ success: false, error: "Failed to track download" }, { status: 500 })
  }
}
