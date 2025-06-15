export function validateNetworkId(networkId: string): boolean {
  // Network ID should be a 64-character hex string (SHA-256)
  return /^[a-f0-9]{64}$/.test(networkId)
}

export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and normalize whitespace
  return input
    .replace(/[<>]/g, "") // Remove HTML brackets
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
}

export function validateFile(
  file: File,
  maxSize: number,
  allowedTypes: string[],
): { isValid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    }
  }

  // Check for suspicious file names
  if (/[<>:"/\\|?*]/.test(file.name)) {
    return {
      isValid: false,
      error: "File name contains invalid characters",
    }
  }

  return { isValid: true }
}
