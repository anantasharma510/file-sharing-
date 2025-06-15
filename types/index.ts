export interface SharedItem {
  _id: string
  type: "text" | "file"
  content: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  networkId: string
  createdAt: string
  expiresAt: string
  downloadCount?: number
}

export interface UploadProgress {
  id: string
  fileName: string
  progress: number
  status: "uploading" | "completed" | "error"
  error?: string | null
}

export interface NetworkStatus {
  networkId: string
  connectedUsers: number
  isOnline: boolean
  lastSync: Date
}

export interface ShareStats {
  totalShares: number
  totalDownloads: number
  storageUsed: number
  activeUsers: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface WebSocketMessage {
  type: string
  networkId: string
  data?: any
  timestamp?: string
}
