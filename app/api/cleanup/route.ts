import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    const now = new Date()

    // Clean up expired shared items
    const expiredItems = await db.collection("shared_items").deleteMany({
      expiresAt: { $lt: now },
    })

    // Clean up old user sessions (older than 5 minutes)
    const oldSessions = await db.collection("user_sessions").deleteMany({
      lastSeen: { $lt: new Date(now.getTime() - 5 * 60 * 1000) },
    })

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      stats: {
        expiredItems: expiredItems.deletedCount,
        oldSessions: oldSessions.deletedCount,
      },
    })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 },
    )
  }
}
