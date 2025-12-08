"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { registerServiceWorker } from "@/lib/notifications"
import { NotificationPrompt } from "@/components/notification-prompt"

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker().then(() => {
      setIsReady(true)
    })
  }, [])

  return (
    <>
      {children}
      {isReady && <NotificationPrompt />}
    </>
  )
}
