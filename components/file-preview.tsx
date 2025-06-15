"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Download, Loader2 } from "lucide-react"
import type { SharedItem } from "@/types"

interface FilePreviewProps {
  item: SharedItem
  onClose: () => void
  onDownload: () => void
}

export function FilePreview({ item, onClose, onDownload }: FilePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setError("Failed to load image preview")
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl max-h-[90vh] w-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{item.fileName}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{formatFileSize(item.fileSize || 0)}</Badge>
              <Badge variant="outline">{item.mimeType}</Badge>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button onClick={onDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative bg-gray-100 flex items-center justify-center min-h-[400px] max-h-[60vh] overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}

            {error ? (
              <div className="text-center text-gray-500 p-8">
                <p>{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={onDownload}>
                  Download to view
                </Button>
              </div>
            ) : (
              <img
                src={`/api/preview/${item._id}`}
                alt={item.fileName}
                className="max-w-full max-h-full object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: isLoading ? "none" : "block" }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
