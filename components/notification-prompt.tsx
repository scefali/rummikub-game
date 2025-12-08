"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, X } from "lucide-react"
import { isNotificationSupported, requestNotificationPermission, getNotificationPermission } from "@/lib/notifications"

interface NotificationPromptProps {
  onPermissionChange?: (permission: NotificationPermission) => void
}

export function NotificationPrompt({ onPermissionChange }: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("notification-prompt-dismissed")
    if (dismissed) setIsDismissed(true)
  }, [])

  const handleEnable = async () => {
    const newPermission = await requestNotificationPermission()
    setPermission(newPermission)
    onPermissionChange?.(newPermission)
    if (newPermission !== "default") {
      setIsDismissed(true)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem("notification-prompt-dismissed", "true")
  }

  // Don't show if not supported, already granted/denied, or dismissed
  if (!isSupported || permission !== "default" || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-lg p-4 shadow-lg z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Enable Notifications</h3>
          <p className="text-sm text-muted-foreground mt-1">Get notified when it's your turn to play</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleEnable}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Small toggle button for notification settings
export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())
  }, [])

  const handleToggle = async () => {
    if (permission === "granted") {
      // Can't revoke programmatically, show info
      alert("To disable notifications, use your browser settings.")
      return
    }
    const newPermission = await requestNotificationPermission()
    setPermission(newPermission)
  }

  if (!isSupported) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={permission === "granted" ? "Notifications enabled" : "Enable notifications"}
    >
      {permission === "granted" ? (
        <Bell className="w-4 h-4 text-primary" />
      ) : (
        <BellOff className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  )
}
