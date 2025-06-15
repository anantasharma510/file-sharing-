const { MongoClient } = require("mongodb")

async function cleanupExpiredData() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/advanced_network_share"

  console.log("🧹 Starting cleanup of expired data...")
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db("advanced_network_share")

    const now = new Date()

    // Clean up expired shared items
    const expiredItems = await db.collection("shared_items").deleteMany({
      expiresAt: { $lt: now },
    })

    // Clean up old user sessions (older than 5 minutes)
    const oldSessions = await db.collection("user_sessions").deleteMany({
      lastSeen: { $lt: new Date(now.getTime() - 5 * 60 * 1000) },
    })

    console.log(`✅ Cleanup completed:`)
    console.log(`   - Removed ${expiredItems.deletedCount} expired items`)
    console.log(`   - Removed ${oldSessions.deletedCount} old sessions`)

    // Get current statistics
    const stats = await db
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
      .toArray()

    const currentStats = stats[0] || { totalItems: 0, totalSize: 0 }
    const sizeInMB = (currentStats.totalSize / 1024 / 1024).toFixed(2)

    console.log(`📊 Current database stats:`)
    console.log(`   - Active items: ${currentStats.totalItems}`)
    console.log(`   - Storage used: ${sizeInMB} MB`)
  } catch (error) {
    console.error("❌ Cleanup failed:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

cleanupExpiredData()
