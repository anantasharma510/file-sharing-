import type { NextRequest } from "next/server"

interface RateLimitOptions {
  maxRequests?: number
  windowMs?: number
}

interface RateLimitResult {
  success: boolean
  remaining?: number
  resetTime?: number
}

// Simple in-memory rate limiting for free plan (no Redis needed)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export async function rateLimit(request: NextRequest, options: RateLimitOptions = {}): Promise<RateLimitResult> {
  const { maxRequests = 30, windowMs = 60000 } = options // More restrictive for free plan

  // Get client identifier
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0] || "unknown"
  const key = `rate_limit:${ip}`

  const now = Date.now()

  // Clean up old entries periodically
  if (Math.random() < 0.1) {
    // 10% chance to cleanup
    for (const [k, v] of requestCounts.entries()) {
      if (v.resetTime < now) {
        requestCounts.delete(k)
      }
    }
  }

  const current = requestCounts.get(key)

  if (!current || current.resetTime < now) {
    // New window
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    }
  }

  if (current.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime,
    }
  }

  // Increment count
  current.count++
  requestCounts.set(key, current)

  return {
    success: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime,
  }
}
