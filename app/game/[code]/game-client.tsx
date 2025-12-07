"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { LobbyScreen } from "@/components/lobby-screen"
import { GameBoard } from "@/components/game-board"
import { PlayerController } from "@/components/player-controller"
import { GameEndScreen } from "@/components/game-end-screen"
import { useIsMobile } from "@/hooks/use-mobile"
import { clearPlayerCookie } from "@/lib/cookies"
import type { GameState, Meld, Tile } from "@/lib/game-types"
import { Loader2 } from "lucide-react"

interface GameClientProps {
  roomCode: string
  playerId: string
  playerName: string
}

export function GameClient({ roomCode, playerId, playerName }: GameClientProps) {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  // API call helper
  const apiCall = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || "Request failed")
    }
    return data
  }, [])

  // Poll for game state
  const pollGameState = useCallback(async () => {
    if (isPollingRef.current) return

    isPollingRef.current = true
    try {
      const data = await apiCall({
        action: "get_state",
        roomCode,
        playerId,
      })
      setGameState(data.gameState)
      setError(null)
      setIsLoading(false)
    } catch (err) {
      // If room not found, clear cookie and redirect
      if (err instanceof Error && err.message.includes("not found")) {
        await clearPlayerCookie()
        router.push("/")
      }
    } finally {
      isPollingRef.current = false
    }
  }, [roomCode, playerId, apiCall, router])

  // Start polling on mount
  useEffect(() => {
    pollGameState()
    pollingRef.current = setInterval(pollGameState, 1000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [pollGameState])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Game actions
  const startGame = useCallback(async () => {
    try {
      await apiCall({ action: "start_game", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game")
    }
  }, [roomCode, playerId, apiCall, pollGameState])

  const playTiles = useCallback(
    async (melds: Meld[], hand: Tile[], workingArea: Tile[] = []) => {
      try {
        await apiCall({ action: "play_tiles", roomCode, playerId, melds, hand, workingArea })
        pollGameState()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to play tiles")
      }
    },
    [roomCode, playerId, apiCall, pollGameState],
  )

  const drawTile = useCallback(async () => {
    try {
      await apiCall({ action: "draw_tile", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draw tile")
    }
  }, [roomCode, playerId, apiCall, pollGameState])

  const endTurn = useCallback(async () => {
    try {
      await apiCall({ action: "end_turn", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end turn")
    }
  }, [roomCode, playerId, apiCall, pollGameState])

  const disconnect = useCallback(async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    try {
      await apiCall({ action: "leave", roomCode, playerId })
    } catch {
      // Ignore
    }

    await clearPlayerCookie()
    router.push("/")
  }, [roomCode, playerId, apiCall, router])

  // Loading state
  if (isLoading || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Reconnecting to game...</p>
      </div>
    )
  }

  // Determine current view
  const currentPlayer = gameState.players.find((p) => p.id === playerId)
  const isHost = currentPlayer?.isHost ?? false

  // In lobby
  if (gameState.phase === "lobby") {
    return (
      <LobbyScreen
        roomCode={roomCode}
        playerId={playerId}
        gameState={gameState}
        onStartGame={startGame}
        onLeave={disconnect}
      />
    )
  }

  // Game ended
  if (gameState.phase === "ended") {
    return (
      <GameEndScreen
        gameState={gameState}
        playerId={playerId}
        onPlayAgain={() => {
          disconnect()
        }}
      />
    )
  }

  // Game in progress
  if (isMobile || !isHost) {
    return (
      <PlayerController
        gameState={gameState}
        playerId={playerId}
        roomCode={roomCode}
        onPlayTiles={playTiles}
        onDrawTile={drawTile}
        onEndTurn={endTurn}
        error={error}
      />
    )
  }

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      roomCode={roomCode}
      onPlayTiles={playTiles}
      onDrawTile={drawTile}
      onEndTurn={endTurn}
      error={error}
    />
  )
}
