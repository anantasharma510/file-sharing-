"use client"

import { useState, useEffect, useRef } from "react"

interface UsePollingOptions {
  interval?: number
  enabled?: boolean
  onError?: (error: Error) => void
}

interface UsePollingReturn<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  refetch: () => Promise<void>
}

export function usePolling<T = any>(url: string | null, options: UsePollingOptions = {}): UsePollingReturn<T> {
  const { interval = 5000, enabled = true, onError } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = async (): Promise<void> => {
    if (!url) return

    try {
      setError(null)

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        const error = new Error(`Polling failed: ${err.message}`)
        setError(error)
        onError?.(error)
      }
    }
  }

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    await fetchData()
    setIsLoading(false)
  }

  useEffect(() => {
    if (!url || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial fetch
    refetch()

    // Set up polling
    intervalRef.current = setInterval(fetchData, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [url, enabled, interval])

  return { data, error, isLoading, refetch }
}
