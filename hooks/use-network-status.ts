"use client"

import { useState, useEffect } from "react"

interface NetworkInfo {
  networkId: string
  connectedUsers: number
}

interface UseNetworkStatusReturn {
  isOnline: boolean
  networkInfo: NetworkInfo
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(true)
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    networkId: "",
    connectedUsers: 0,
  })

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch("/api/network")
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setNetworkInfo({
              networkId: data.data.networkId,
              connectedUsers: data.data.connectedUsers,
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch network info:", error)
      }
    }

    // Initial fetch
    fetchNetworkInfo()

    // Set up event listeners
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    // Periodic network info updates
    const interval = setInterval(fetchNetworkInfo, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, networkInfo }
}
