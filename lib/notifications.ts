"use client"

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return "denied"
  }
  return await Notification.requestPermission()
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return "denied"
  }
  return Notification.permission
}

function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false
  return window.location.hostname.includes("vusercontent.net")
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  if (isPreviewEnvironment()) {
    console.log("[v0] Skipping service worker in preview environment")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js")
    console.log("[v0] Service worker registered:", registration.scope)
    return registration
  } catch (error) {
    console.log("[v0] Service worker registration skipped (will work when deployed)")
    return null
  }
}

// Show a local notification (for when tab is in background)
export async function showTurnNotification(playerName: string, roomCode: string): Promise<void> {
  if (!isNotificationSupported()) return
  if (Notification.permission !== "granted") return

  // Don't notify if tab is focused
  if (document.visibilityState === "visible") return

  if (isPreviewEnvironment()) return

  const registration = await navigator.serviceWorker.ready

  await registration.showNotification("Rummikub - Your Turn!", {
    body: `${playerName}, it's your turn to play!`,
    icon: "/icons/icon-192.jpg",
    badge: "/icons/icon-192.jpg",
    vibrate: [200, 100, 200],
    tag: "turn-notification",
    renotify: true,
    data: {
      url: `/game/${roomCode}`,
    },
  })
}
