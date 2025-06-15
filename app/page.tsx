"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  Send,
  Download,
  FileText,
  ImageIcon,
  Video,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Copy,
  Share2,
  Trash2,
  RefreshCw,
  Loader2,
  Cloud,
  Zap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { usePolling } from "@/hooks/use-polling"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { FilePreview } from "@/components/file-preview"
import { NetworkInfo } from "@/components/network-info"
import { ErrorBoundary } from "@/components/error-boundary"
import type { SharedItem, UploadProgress, NetworkStatus, ShareStats as ShareStatsType, ApiResponse } from "@/types"

// Vercel Free Plan Optimized Limits
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB (safe margin under 4.5MB limit)
const MAX_NETWORK_STORAGE = 50 * 1024 * 1024 // 50MB per network
const MAX_ITEMS_PER_NETWORK = 25 // Reduced for free plan
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "text/plain", "application/pdf"]

export default function HomePage() {
  const [items, setItems] = useState<SharedItem[]>([])
  const [textContent, setTextContent] = useState("")
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    networkId: "",
    connectedUsers: 0,
    isOnline: true,
    lastSync: new Date(),
  })
  const [shareStats, setShareStats] = useState<ShareStatsType>({
    totalShares: 0,
    totalDownloads: 0,
    storageUsed: 0,
    activeUsers: 0,
  })
  const [selectedItem, setSelectedItem] = useState<SharedItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const { toast } = useToast()

  // Custom hooks
  const { isOnline, networkInfo } = useNetworkStatus()

  // Polling for real-time updates (optimized for free plan)
  const { data: pollingData, error: pollingError } = usePolling(
    networkStatus.networkId ? `/api/items?networkId=${networkStatus.networkId}` : null,
    {
      interval: 5000, // 5 seconds to reduce function calls
      enabled: !!networkStatus.networkId && isOnline,
    },
  )

  // Update items from polling
  useEffect(() => {
    if (pollingData?.success && pollingData.data?.items) {
      const newItems = pollingData.data.items
      setItems((prevItems) => {
        // Check if there are new items
        if (JSON.stringify(prevItems) !== JSON.stringify(newItems)) {
          // Find newly added items
          const newItemIds = newItems.map((item: SharedItem) => item._id)
          const prevItemIds = prevItems.map((item) => item._id)
          const addedItems = newItems.filter((item: SharedItem) => !prevItemIds.includes(item._id))

          // Show toast for new items (limit notifications)
          if (addedItems.length > 0 && addedItems.length <= 3) {
            addedItems.forEach((item: SharedItem) => {
              if (item.type === "file") {
                toast({
                  title: "New file shared",
                  description: `${item.fileName} was shared.`,
                })
              } else {
                toast({
                  title: "New message shared",
                  description: "Someone shared a message.",
                })
              }
            })
          } else if (addedItems.length > 3) {
            toast({
              title: "Multiple items shared",
              description: `${addedItems.length} new items were shared.`,
            })
          }
        }
        return newItems
      })
      setNetworkStatus((prev) => ({ ...prev, lastSync: new Date() }))
    }
  }, [pollingData, toast])

  // Handle polling errors
  useEffect(() => {
    if (pollingError) {
      setError("Connection lost. Retrying...")
    } else {
      setError(null)
    }
  }, [pollingError])

  // Initialize app
  useEffect(() => {
    initializeApp()
  }, [])

  // Network status monitoring
  useEffect(() => {
    setNetworkStatus((prev) => ({
      ...prev,
      isOnline,
      ...networkInfo,
    }))
  }, [isOnline, networkInfo])

  const initializeApp = async () => {
    try {
      setIsLoading(true)
      setError(null)

      await Promise.all([fetchNetworkInfo(), fetchItems(), fetchShareStats()])

      setRetryCount(0)
    } catch (error) {
      handleError(error, "Failed to initialize application")
      if (retryCount < 2) {
        // Reduced retry attempts for free plan
        setTimeout(
          () => {
            setRetryCount((prev) => prev + 1)
            initializeApp()
          },
          3000 * (retryCount + 1),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNetworkInfo = async (): Promise<void> => {
    const response = await fetch("/api/network")
    if (!response.ok) throw new Error(`Network API failed: ${response.status}`)

    const data: ApiResponse<NetworkStatus> = await response.json()
    if (!data.success) throw new Error(data.error || "Failed to get network info")

    setNetworkStatus((prev) => ({ ...prev, ...data.data }))
  }

  const fetchItems = async (): Promise<void> => {
    if (!networkStatus.networkId) return

    const response = await fetch(`/api/items?networkId=${networkStatus.networkId}`)
    if (!response.ok) throw new Error(`Items API failed: ${response.status}`)

    const data: ApiResponse<{ items: SharedItem[] }> = await response.json()
    if (!data.success) throw new Error(data.error || "Failed to fetch items")

    setItems(data.data?.items || [])
    setNetworkStatus((prev) => ({ ...prev, lastSync: new Date() }))
  }

  const fetchShareStats = async (): Promise<void> => {
    if (!networkStatus.networkId) return

    try {
      const response = await fetch(`/api/stats?networkId=${networkStatus.networkId}`)
      if (response.ok) {
        const data: ApiResponse<ShareStatsType> = await response.json()
        if (data.success && data.data) {
          setShareStats(data.data)
        }
      }
    } catch (error) {
      console.warn("Failed to fetch stats:", error)
    }
  }

  const shareText = async (): Promise<void> => {
    if (!textContent.trim() || !networkStatus.networkId) return

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          content: textContent.trim(),
          networkId: networkStatus.networkId,
        }),
      })

      const data: ApiResponse<{ itemId: string }> = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setTextContent("")
      await fetchItems()
      await fetchShareStats()

      toast({
        title: "Text shared successfully!",
        description: "Your message is now available to others on this network.",
      })
    } catch (error) {
      handleError(error, "Failed to share text")
    }
  }

  const shareFiles = async (files: FileList): Promise<void> => {
    if (!networkStatus.networkId) {
      toast({
        title: "Network Error",
        description: "Please wait for network connection.",
        variant: "destructive",
      })
      return
    }

    const validFiles = Array.from(files).filter((file) => validateFile(file))
    if (validFiles.length === 0) return

    // Check if adding these files would exceed limits
    const totalNewSize = validFiles.reduce((sum, file) => sum + file.size, 0)
    if (shareStats.storageUsed + totalNewSize > MAX_NETWORK_STORAGE) {
      toast({
        title: "Storage limit exceeded",
        description: `Adding these files would exceed the 50MB network limit.`,
        variant: "destructive",
      })
      return
    }

    if (items.length + validFiles.length > MAX_ITEMS_PER_NETWORK) {
      toast({
        title: "Item limit exceeded",
        description: `Network can only have ${MAX_ITEMS_PER_NETWORK} items maximum.`,
        variant: "destructive",
      })
      return
    }

    const uploadPromises = validFiles.map((file) => uploadFile(file))

    try {
      await Promise.allSettled(uploadPromises)
      await fetchItems()
      await fetchShareStats()
    } catch (error) {
      handleError(error, "Some files failed to upload")
    }
  }

  const uploadFile = async (file: File): Promise<void> => {
    const uploadId = `${Date.now()}-${Math.random()}`

    // Add to upload progress
    setUploadProgress((prev) => [
      ...prev,
      {
        id: uploadId,
        fileName: file.name,
        progress: 0,
        status: "uploading",
        error: null,
      },
    ])

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("networkId", networkStatus.networkId)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress } : item)))
        }
      }

      // Handle completion
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              setUploadProgress((prev) =>
                prev.map((item) => (item.id === uploadId ? { ...item, status: "completed", progress: 100 } : item)),
              )
              resolve()
            } else {
              reject(new Error(response.error || "Upload failed"))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }

        xhr.onerror = () => reject(new Error("Network error during upload"))
        xhr.ontimeout = () => reject(new Error("Upload timeout"))
      })

      xhr.timeout = 60000 // 1 minute timeout for free plan
      xhr.open("POST", "/api/upload")
      xhr.send(formData)

      await uploadPromise

      toast({
        title: "File uploaded successfully!",
        description: `${file.name} is now available to others.`,
      })
    } catch (error) {
      setUploadProgress((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : item,
        ),
      )

      handleError(error, `Failed to upload ${file.name}`)
    } finally {
      // Remove from progress after 3 seconds
      setTimeout(() => {
        setUploadProgress((prev) => prev.filter((item) => item.id !== uploadId))
      }, 3000)
    }
  }

  const downloadFile = async (item: SharedItem): Promise<void> => {
    try {
      const response = await fetch(`/api/download/${item._id}`)

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")

      a.href = url
      a.download = item.fileName || "download"
      document.body.appendChild(a)
      a.click()

      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Track download
      await fetch(`/api/items/${item._id}/download`, { method: "POST" })
      await fetchShareStats()

      toast({
        title: "Download started",
        description: `${item.fileName} is being downloaded.`,
      })
    } catch (error) {
      handleError(error, "Failed to download file")
    }
  }

  const deleteItem = async (item: SharedItem): Promise<void> => {
    try {
      const response = await fetch(`/api/items/${item._id}`, {
        method: "DELETE",
      })

      const data: ApiResponse<{}> = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete item")
      }

      await fetchItems()
      await fetchShareStats()

      toast({
        title: "Item deleted",
        description: "The item has been removed from the network.",
      })
    } catch (error) {
      handleError(error, "Failed to delete item")
    }
  }

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied to your clipboard.",
      })
    } catch (error) {
      handleError(error, "Failed to copy to clipboard")
    }
  }

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds the 4MB limit for free hosting.`,
        variant: "destructive",
      })
      return false
    }

    const isValidType = ALLOWED_FILE_TYPES.includes(file.type)

    if (!isValidType) {
      toast({
        title: "File type not supported",
        description: `${file.name} type is not supported. Allowed: Images, PDF, Text files.`,
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleError = (error: unknown, context: string): void => {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`${context}:`, error)

    setError(`${context}: ${message}`)

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0

    const files = e.dataTransfer.files
    if (files.length > 0) {
      shareFiles(files)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    if (mimeType.startsWith("video/")) return <Video className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const getStoragePercentage = () => {
    return Math.round((shareStats.storageUsed / MAX_NETWORK_STORAGE) * 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">Initializing Network Share</h2>
          <p className="text-gray-600">Connecting to your network...</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Cloud className="w-4 h-4 text-blue-600" />
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-sm text-blue-600">Powered by Vercel Free Plan</span>
          </div>
          {retryCount > 0 && <p className="text-sm text-orange-600 mt-2">Retry attempt {retryCount}/2</p>}
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Network Share</h1>
            <p className="text-gray-600 mb-2">Secure file and text sharing on your local network</p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 mb-2">
              <Cloud className="w-4 h-4" />
              <Zap className="w-4 h-4 text-green-600" />
              <span>Free Hosting • 4MB files • 50MB network storage</span>
            </div>

            <NetworkInfo networkStatus={networkStatus} isConnected={isOnline} onRefresh={initializeApp} />
          </div>

          {/* Storage Usage Warning */}
          {getStoragePercentage() > 80 && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Network storage is {getStoragePercentage()}% full ({formatFileSize(shareStats.storageUsed)} /{" "}
                {formatFileSize(MAX_NETWORK_STORAGE)}). Consider deleting old files.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats with Storage Usage */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Network Activity</CardTitle>
              <CardDescription>Statistics for your local network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <Share2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{shareStats.totalShares}</div>
                  <div className="text-sm text-gray-600">Total Shares</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                    <Download className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{shareStats.totalDownloads}</div>
                  <div className="text-sm text-gray-600">Downloads</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{items.length}</div>
                  <div className="text-sm text-gray-600">Items ({MAX_ITEMS_PER_NETWORK} max)</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
                    <Cloud className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{shareStats.activeUsers}</div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
              </div>

              {/* Storage Usage Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Used</span>
                  <span>
                    {formatFileSize(shareStats.storageUsed)} / {formatFileSize(MAX_NETWORK_STORAGE)}
                  </span>
                </div>
                <Progress value={getStoragePercentage()} className="h-2" />
                <div className="text-xs text-gray-500 text-center">
                  {100 - getStoragePercentage()}% remaining • Free plan limit
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadProgress.map((upload) => (
                  <div key={upload.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{upload.fileName}</span>
                      <div className="flex items-center gap-2">
                        {upload.status === "completed" && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {upload.status === "error" && <AlertCircle className="w-4 h-4 text-red-600" />}
                        <span className="text-sm text-gray-600">{upload.progress}%</span>
                      </div>
                    </div>
                    <Progress value={upload.progress} className="h-2" />
                    {upload.error && <p className="text-sm text-red-600">{upload.error}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Share Interface */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Content
              </CardTitle>
              <CardDescription>
                Share text or files with others on your network. Content expires in 24 hours. Max file size: 4MB •
                Network limit: {MAX_ITEMS_PER_NETWORK} items, 50MB total.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Text Message</TabsTrigger>
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <Textarea
                    placeholder="Type your message here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[120px] resize-none"
                    maxLength={5000} // Reduced for free plan
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{textContent.length}/5,000 characters</span>
                    <Button
                      onClick={shareText}
                      disabled={!textContent.trim() || !networkStatus.isOnline || items.length >= MAX_ITEMS_PER_NETWORK}
                      className="min-w-[120px]"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Share Text
                    </Button>
                  </div>
                  {items.length >= MAX_ITEMS_PER_NETWORK && (
                    <p className="text-sm text-orange-600">Network item limit reached. Delete some items first.</p>
                  )}
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Drag and drop files here, or click to select</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Maximum file size: 4MB • Supported: Images (JPEG, PNG, GIF, WebP), PDF, Text files
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files
                        if (files) shareFiles(files)
                      }}
                      disabled={
                        !networkStatus.isOnline || items.length >= MAX_ITEMS_PER_NETWORK || getStoragePercentage() >= 95
                      }
                      className="max-w-xs mx-auto"
                      accept={ALLOWED_FILE_TYPES.join(",")}
                    />
                    {(items.length >= MAX_ITEMS_PER_NETWORK || getStoragePercentage() >= 95) && (
                      <p className="text-sm text-orange-600 mt-2">
                        {items.length >= MAX_ITEMS_PER_NETWORK
                          ? "Item limit reached"
                          : "Storage almost full - delete some files first"}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Shared Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Shared Content
                  </CardTitle>
                  <CardDescription>
                    Content shared on this network ({items.length}/{MAX_ITEMS_PER_NETWORK} items)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchItems} disabled={!networkStatus.isOnline}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">No content shared yet</h3>
                  <p>Be the first to share something with your network!</p>
                  <p className="text-sm mt-2 text-blue-600">Free plan: 4MB files • 50MB total • 25 items max</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {item.type === "text" ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">Text Message</span>
                                <Badge variant="secondary" className="text-xs">
                                  {new Date(item.createdAt).toLocaleTimeString()}
                                </Badge>
                              </div>
                              <div className="bg-gray-100 p-4 rounded-lg mb-3">
                                <p className="text-gray-700 whitespace-pre-wrap break-words">{item.content}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(item.content)}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                {getFileIcon(item.mimeType || "")}
                                <span className="font-medium truncate">{item.fileName}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {formatFileSize(item.fileSize || 0)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {new Date(item.createdAt).toLocaleTimeString()}
                                </Badge>
                              </div>

                              <div className="flex gap-2 flex-wrap">
                                <Button onClick={() => downloadFile(item)} variant="outline" size="sm">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>

                                {item.mimeType?.startsWith("image/") && (
                                  <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Preview
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-right text-sm text-gray-500">
                            <p>Expires in</p>
                            <p className="font-medium">{getTimeRemaining(item.expiresAt)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItem(item)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Preview Modal */}
        {selectedItem && (
          <FilePreview
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDownload={() => downloadFile(selectedItem)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
