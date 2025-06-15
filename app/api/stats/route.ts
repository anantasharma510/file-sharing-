import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { rateLimit } from "@/lib/rate-limit"
import { validateNetworkId } from "@/lib/validation"

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const networkId = searchParams.get("networkId")

    if (!networkId || !validateNetworkId(networkId)) {
      return NextResponse.json({ success: false, error: "Valid network ID required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Get network statistics
    const [itemStats, userStats] = await Promise.all([
      // Item statistics
      db
        .collection("shared_items")
        .aggregate([
          { $match: { networkId, expiresAt: { $gt: new Date() } } },
          {
            $group: {
              _id: null,
              totalShares: { $sum: 1 },
              totalDownloads: { $sum: "$downloadCount" },
              storageUsed: { $sum: "$fileSize" },
            },
          },
        ])
        .toArray(),

      // Active users in last 5 minutes
      db
        .collection("user_sessions")
        .countDocuments({
          networkId,
          lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
        }),
    ])

    const stats = itemStats[0] || { totalShares: 0, totalDownloads: 0, storageUsed: 0 }

    return NextResponse.json({
      success: true,
      data: {
        totalShares: stats.totalShares,
        totalDownloads: stats.totalDownloads,
        storageUsed: stats.storageUsed,
        activeUsers: userStats,
      },
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch statistics",
      },
      { status: 500 },
    )
  }
}
