const fs = require("fs")
const path = require("path")

// Create .env.local file with MongoDB connection string
const envContent = `# MongoDB Connection String
# Replace with your actual MongoDB URI
MONGODB_URI=mongodb://localhost:27017/local_network_share

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/local_network_share

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
`

const envPath = path.join(process.cwd(), ".env.local")

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent)
  console.log("✅ Created .env.local file")
  console.log("📝 Please update the MONGODB_URI with your actual MongoDB connection string")
} else {
  console.log("⚠️  .env.local already exists")
}

console.log("\n🚀 Setup complete! Next steps:")
console.log("1. Update MONGODB_URI in .env.local")
console.log("2. Install MongoDB locally or use MongoDB Atlas")
console.log("3. Run: npm run dev")
