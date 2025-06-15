"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Users, Clock, RefreshCw, CheckCircle, AlertCircle, Database } from "lucide-react"
import type { NetworkStatus } from "@/types"
import { cn } from "@/lib/utils"

interface NetworkInfoProps {
  networkStatus: NetworkStatus
  isConnected: boolean
  onRefresh: () => void
}

export function NetworkInfo({ networkStatus, isConnected, onRefresh }: NetworkInfoProps) {
  const getConnectionStatus = () => {
    if (!networkStatus.isOnline) return { icon: WifiOff, color: "text-red-600", text: "Offline" }
    if (!isConnected) return { icon: AlertCircle, color: "text-orange-600", text: "Connecting" }
    return { icon: CheckCircle, color: "text-green-600", text: "Connected" }
  }

  const status = getConnectionStatus()
  const StatusIcon = status.icon

  return (
    <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
      <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
        <Wifi className="w-4 h-4" />
        Network: {networkStatus.networkId.slice(-8) || "Detecting..."}
      </Badge>

      <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
        <Users className="w-4 h-4" />
        {networkStatus.connectedUsers} Connected
      </Badge>

      <Badge variant="outline" className={cn("flex items-center gap-2 px-3 py-1", status.color)}>
        <StatusIcon className="w-4 h-4" />
        {status.text}
      </Badge>

      <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
        <Clock className="w-4 h-4" />
        Last sync: {networkStatus.lastSync.toLocaleTimeString()}
      </Badge>

      <Badge variant="outline" className="flex items-center gap-2 px-3 py-1 text-green-600">
        <Database className="w-4 h-4" />
        MongoDB TTL Auto-cleanup
      </Badge>

      <Button variant="ghost" size="sm" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  )
}
