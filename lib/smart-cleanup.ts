import type { Db } from "mongodb"

interface CleanupStats {
  expiredItems: number
  oldSessions: number
  veryOldItems: number
}

let lastCleanup = 0
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes between cleanups

export async function smartCleanup(db: Db): Promise<CleanupStats | null> {
  const now = Date.now()

  // Only run cleanup every 5 minutes to avoid excessive operations
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return null
  }

  lastCleanup = now

  try {
    const currentTime = new Date()

    // Clean up expired items (TTL should handle this, but backup cleanup)
    const expiredItems = await db.collection("shared_items").deleteMany({
      expiresAt: { $lt: currentTime },
    })

    // Clean up old user sessions (TTL should handle this too)
    const oldSessions = await db.collection("user_sessions").deleteMany({
      lastSeen: { $lt: new Date(currentTime.getTime() - 10 * 60 * 1000) }, // 10 minutes old
    })

    // Clean up very old items as safety measure (48+ hours old)
    const veryOldItems = await db.collection("shared_items").deleteMany({
      createdAt: { $lt: new Date(currentTime.getTime() - 48 * 60 * 60 * 1000) },
    })

    const stats = {
      expiredItems: expiredItems.deletedCount,
      oldSessions: oldSessions.deletedCount,
      veryOldItems: veryOldItems.deletedCount,
    }

    // Only log if something was cleaned up
    if (stats.expiredItems > 0 || stats.oldSessions > 0 || stats.veryOldItems > 0) {
      console.log(`Smart cleanup completed:`, stats)
    }

    return stats
  } catch (error) {
    console.error("Smart cleanup error:", error)
    return null
  }
}

export async function forceCleanup(db: Db): Promise<CleanupStats> {
  const currentTime = new Date()

  const [expiredItems, oldSessions, veryOldItems] = await Promise.all([
    db.collection("shared_items").deleteMany({
      expiresAt: { $lt: currentTime },
    }),
    db.collection("user_sessions").deleteMany({
      lastSeen: { $lt: new Date(currentTime.getTime() - 5 * 60 * 1000) },
    }),
    db.collection("shared_items").deleteMany({
      createdAt: { $lt: new Date(currentTime.getTime() - 48 * 60 * 60 * 1000) },
    }),
  ])

  return {
    expiredItems: expiredItems.deletedCount,
    oldSessions: oldSessions.deletedCount,
    veryOldItems: veryOldItems.deletedCount,
  }
}
