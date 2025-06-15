import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import crypto from "crypto"
import { connectToDatabase } from "@/lib/mongodb"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting with Upstash Redis
    const rateLimitResult = await rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    const headersList = headers()
    const forwarded = headersList.get("x-forwarded-for")
    const realIp = headersList.get("x-real-ip")

    // Get client IP with Vercel-specific headers
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "127.0.0.1"

    // Generate network ID based on IP subnet (first 3 octets)
    const ipParts = clientIp.split(".")
    if (ipParts.length !== 4) {
      // Fallback for IPv6 or invalid IPs
      const networkBase = clientIp.substring(0, clientIp.lastIndexOf(":")) || clientIp
      const networkId = crypto.createHash("sha256").update(networkBase).digest("hex")

      return NextResponse.json({
        success: true,
        data: {
          networkId,
          connectedUsers: 1,
          clientIp: clientIp,
          timestamp: new Date().toISOString(),
        },
      })
    }

    const networkBase = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`
    const networkId = crypto.createHash("sha256").update(networkBase).digest("hex")

    // Connect to database and update user activity
    const { db } = await connectToDatabase()

    // Update or create user session
    const now = new Date()
    await db.collection("user_sessions").updateOne(
      { networkId, clientIp },
      {
        $set: {
          networkId,
          clientIp,
          lastSeen: now,
          userAgent: headersList.get("user-agent") || "Unknown",
        },
      },
      { upsert: true },
    )

    // Clean up old sessions (older than 5 minutes)
    await db.collection("user_sessions").deleteMany({
      lastSeen: { $lt: new Date(now.getTime() - 5 * 60 * 1000) },
    })

    // Count connected users for this network
    const connectedUsers = await db.collection("user_sessions").countDocuments({
      networkId,
      lastSeen: { $gte: new Date(now.getTime() - 5 * 60 * 1000) },
    })

    return NextResponse.json({
      success: true,
      data: {
        networkId,
        connectedUsers,
        clientIp: clientIp,
        timestamp: now.toISOString(),
      },
    })
  } catch (error) {
    console.error("Network API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get network information",
      },
      { status: 500 },
    )
  }
}
