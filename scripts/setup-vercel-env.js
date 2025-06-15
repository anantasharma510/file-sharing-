const fs = require("fs")
const path = require("path")

// Create .env.local file with Vercel-specific configuration
const envContent = `# MongoDB Connection String (use MongoDB Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vercel_network_share

# Vercel Blob Storage (automatically configured in Vercel dashboard)
# BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Upstash Redis for Rate Limiting (optional but recommended)
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=...

# Next.js Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
`

const envPath = path.join(process.cwd(), ".env.local")

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent)
  console.log("✅ Created .env.local file")
} else {
  console.log("⚠️  .env.local already exists")
}

console.log("\n🚀 Vercel Setup Instructions:")
console.log("1. Update MONGODB_URI with your MongoDB Atlas connection string")
console.log("2. Enable Vercel Blob in your Vercel dashboard")
console.log("3. (Optional) Set up Upstash Redis for production rate limiting")
console.log("4. Deploy to Vercel: vercel --prod")
console.log("\n📋 Vercel-specific optimizations:")
console.log("   - File storage: Vercel Blob (4.5MB limit)")
console.log("   - Rate limiting: Upstash Redis (fallback to in-memory)")
console.log("   - Real-time updates: Polling (replaces WebSockets)")
console.log("   - Database: MongoDB Atlas (serverless-optimized)")
