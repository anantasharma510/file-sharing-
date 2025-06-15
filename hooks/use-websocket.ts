"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface UseWebSocketOptions {
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  onReconnect?: () => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  sendMessage: (data: any) => void
  disconnect: () => void
  reconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { onMessage, onError, onOpen, onClose, onReconnect, reconnectAttempts = 5, reconnectInterval = 3000 } = options

  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const shouldReconnectRef = useRef(true)

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/api/ws`

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        reconnectCountRef.current = 0

        if (reconnectCountRef.current > 0 && onReconnect) {
          onReconnect()
        }

        onOpen?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        onClose?.()

        if (shouldReconnectRef.current && reconnectCountRef.current < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++
            connect()
          }, reconnectInterval * Math.pow(1.5, reconnectCountRef.current))
        }
      }

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        onError?.(error)
      }
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error)
    }
  }, [onMessage, onError, onOpen, onClose, onReconnect, reconnectAttempts, reconnectInterval])

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data))
      } catch (error) {
        console.error("Failed to send WebSocket message:", error)
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    shouldReconnectRef.current = true
    reconnectCountRef.current = 0
    connect()
  }, [connect, disconnect])

  useEffect(() => {
    connect()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect,
  }
}
