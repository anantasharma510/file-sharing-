const { MongoClient } = require("mongodb")

async function setupDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/advanced_network_share"

  console.log("🔗 Connecting to MongoDB...")
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db("advanced_network_share")

    console.log("📊 Creating collections and indexes...")

    // Create collections
    await db.createCollection("shared_items")
    await db.createCollection("user_sessions")

    // Create indexes
    await Promise.all([
      // TTL index for shared_items (24 hour expiration)
      db
        .collection("shared_items")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

      // Network and date index for efficient queries
      db
        .collection("shared_items")
        .createIndex({
          networkId: 1,
          createdAt: -1,
        }),

      // Compound index for active items
      db
        .collection("shared_items")
        .createIndex({
          networkId: 1,
          expiresAt: 1,
          createdAt: -1,
        }),

      // TTL index for user sessions (5 minute expiration)
      db
        .collection("user_sessions")
        .createIndex({ lastSeen: 1 }, { expireAfterSeconds: 300 }),

      // Network index for user sessions
      db
        .collection("user_sessions")
        .createIndex({ networkId: 1 }),
    ])

    console.log("✅ Database setup completed successfully!")
    console.log("📋 Collections created:")
    console.log("   - shared_items (with TTL index)")
    console.log("   - user_sessions (with TTL index)")
    console.log("🔍 Indexes created for optimal performance")
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupDatabase()
