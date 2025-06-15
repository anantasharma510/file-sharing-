"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Share2, Download, HardDrive, Users } from "lucide-react"
import type { ShareStats as ShareStatsType } from "@/types"
import { cn } from "@/lib/utils"

interface ShareStatsProps {
  stats: ShareStatsType
  className?: string
}

export function ShareStats({ stats, className }: ShareStatsProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Network Activity</CardTitle>
        <CardDescription>Statistics for your local network</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
              <Share2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalShares}</div>
            <div className="text-sm text-gray-600">Total Shares</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalDownloads}</div>
            <div className="text-sm text-gray-600">Downloads</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatBytes(stats.storageUsed)}</div>
            <div className="text-sm text-gray-600">Storage Used</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
