import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { forceCleanup } from "@/lib/smart-cleanup"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    // Force a comprehensive cleanup
    const stats = await forceCleanup(db)

    // Get current database statistics
    const [currentStats, totalSessions] = await Promise.all([
      db
        .collection("shared_items")
        .aggregate([
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              totalSize: { $sum: "$fileSize" },
            },
          },
        ])
        .toArray(),
      db.collection("user_sessions").countDocuments({}),
    ])

    const dbStats = currentStats[0] || { totalItems: 0, totalSize: 0 }
    const sizeInMB = (dbStats.totalSize / 1024 / 1024).toFixed(2)

    console.log(
      `Daily cleanup completed: ${stats.expiredItems} expired items, ${stats.oldSessions} old sessions, ${stats.veryOldItems} very old items`,
    )

    return NextResponse.json({
      success: true,
      message: "Daily cleanup completed successfully",
      stats: {
        cleaned: stats,
        current: {
          totalItems: dbStats.totalItems,
          totalSessions: totalSessions,
          storageUsedMB: Number.parseFloat(sizeInMB),
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Daily cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Daily cleanup failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
