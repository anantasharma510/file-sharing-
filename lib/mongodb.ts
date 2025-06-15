import { MongoClient, type Db } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 5, // Reduced for serverless
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = await clientPromise
    const db = client.db("vercel_network_share")

    // Always ensure TTL indexes exist (both dev and production)
    await Promise.all([
      // TTL index for auto-deletion after 24 hours
      db
        .collection("shared_items")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

      // Index for network-based queries
      db
        .collection("shared_items")
        .createIndex({ networkId: 1, createdAt: -1 }),

      // Index for user sessions with TTL (5 minutes)
      db
        .collection("user_sessions")
        .createIndex({ lastSeen: 1 }, { expireAfterSeconds: 300 }),

      db.collection("user_sessions").createIndex({ networkId: 1 }),

      // Additional cleanup index for very old items
      db
        .collection("shared_items")
        .createIndex({ createdAt: 1 }),
    ])

    return { client, db }
  } catch (error) {
    console.error("MongoDB connection error:", error)
    throw error
  }
}

export default clientPromise
