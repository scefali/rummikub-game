"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GameClient } from "./game-client"
import { PlayerConfirmModal } from "@/components/player-confirm-modal"
import { setPlayerCookie } from "@/lib/cookies"
import { Loader2 } from "lucide-react"
import { QueueModeProvider } from "@/lib/queue-mode-context"

interface GamePageClientProps {
  roomCode: string
  pendingLogin: {
    playerCode: string
    playerName: string
  }
}

export function GamePageClient({ roomCode, pendingLogin }: GamePageClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmedPlayer, setConfirmedPlayer] = useState<{ playerId: string; playerName: string } | null>(null)

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login_with_code",
          roomCode,
          playerCode: pendingLogin.playerCode,
        }),
      })
      const data = await response.json()

      if (data.success && data.playerId && data.playerName) {
        await setPlayerCookie(data.playerId, data.playerName, roomCode)
        setConfirmedPlayer({ playerId: data.playerId, playerName: data.playerName })
      } else {
        // Login failed, redirect to home
        router.push(`/?join=${roomCode}`)
      }
    } catch {
      router.push(`/?join=${roomCode}`)
    } finally {
      setIsLoading(false)
    }
  }, [roomCode, pendingLogin.playerCode, router])

  const handleDeny = useCallback(() => {
    router.push(`/?join=${roomCode}`)
  }, [roomCode, router])

  // Show loading state while confirming
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Logging you in...</p>
      </div>
    )
  }

  // If confirmed, show the game
  if (confirmedPlayer) {
    return (
      <QueueModeProvider>
        <GameClient roomCode={roomCode} playerId={confirmedPlayer.playerId} playerName={confirmedPlayer.playerName} />
      </QueueModeProvider>
    )
  }

  // Show confirmation modal
  return (
    <div className="min-h-screen bg-background">
      <PlayerConfirmModal
        playerName={pendingLogin.playerName}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
        isLoading={isLoading}
      />
    </div>
  )
}
