import type { Db } from "mongodb"

interface CleanupStats {
  expiredItems: number
  oldSessions: number
  veryOldItems: number
}

let lastCleanup = 0
const CLEANUP_INTERVAL = 10 * 60 * 1000 // 10 minutes between cleanups (less frequent)

export async function smartCleanup(db: Db): Promise<CleanupStats | null> {
  const now = Date.now()

  // Only run cleanup every 10 minutes to reduce function calls
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return null
  }

  lastCleanup = now

  try {
    const currentTime = new Date()

    // Minimal cleanup - let TTL handle most of it
    const [expiredItems, oldSessions] = await Promise.all([
      // Only clean obviously expired items (TTL backup)
      db
        .collection("shared_items")
        .deleteMany({
          expiresAt: { $lt: new Date(currentTime.getTime() - 60 * 60 * 1000) }, // 1 hour past expiry
        }),

      // Clean very old sessions (TTL backup)
      db
        .collection("user_sessions")
        .deleteMany({
          lastSeen: { $lt: new Date(currentTime.getTime() - 15 * 60 * 1000) }, // 15 minutes old
        }),
    ])

    const stats = {
      expiredItems: expiredItems.deletedCount,
      oldSessions: oldSessions.deletedCount,
      veryOldItems: 0,
    }

    // Only log if something significant was cleaned
    if (stats.expiredItems > 5 || stats.oldSessions > 10) {
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
    // Clean expired items
    db
      .collection("shared_items")
      .deleteMany({
        expiresAt: { $lt: currentTime },
      }),

    // Clean old sessions
    db
      .collection("user_sessions")
      .deleteMany({
        lastSeen: { $lt: new Date(currentTime.getTime() - 5 * 60 * 1000) },
      }),

    // Clean very old items (48+ hours)
    db
      .collection("shared_items")
      .deleteMany({
        createdAt: { $lt: new Date(currentTime.getTime() - 48 * 60 * 60 * 1000) },
      }),
  ])

  return {
    expiredItems: expiredItems.deletedCount,
    oldSessions: oldSessions.deletedCount,
    veryOldItems: veryOldItems.deletedCount,
  }
}
