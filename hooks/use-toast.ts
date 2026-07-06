"use client"

import { useCallback } from "react"
import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    if (options.variant === "destructive") {
      sonnerToast.error(options.title || options.description, {
        description: options.description,
      })
    } else {
      sonnerToast.success(options.title || options.description, {
        description: options.description,
      })
    }
  }, [])

  return { toast }
}