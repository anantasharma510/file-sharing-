import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { forceCleanup } from "@/lib/smart-cleanup"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting for manual cleanup
    const rateLimitResult = await rateLimit(request, { maxRequests: 2, windowMs: 60000 })
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many cleanup requests" }, { status: 429 })
    }

    const { db } = await connectToDatabase()

    // Force cleanup
    const stats = await forceCleanup(db)

    return NextResponse.json({
      success: true,
      message: "Manual cleanup completed",
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Manual cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Manual cleanup failed",
      },
      { status: 500 },
    )
  }
}
