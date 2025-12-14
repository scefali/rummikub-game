"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { LobbyScreen } from "@/components/lobby-screen"
import { GameBoard } from "@/components/game-board"
import { PlayerController } from "@/components/player-controller"
import { GameEndScreen } from "@/components/game-end-screen"
import { useIsMobile } from "@/hooks/use-mobile"
import { clearPlayerCookie } from "@/lib/cookies"
import { showTurnNotification } from "@/lib/notifications"
import { playTurnSound } from "@/lib/settings"
import type { GameState, Meld, Tile, RoomStyleId } from "@/lib/game-types"
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
  const [roomStyleId, setRoomStyleId] = useState<RoomStyleId>("classic")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [queueMode, setQueueMode] = useState(false)
  const [queuedGameState, setQueuedGameState] = useState<{
    melds: Meld[]
    hand: Tile[]
    workingArea: Tile[]
  } | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)
  const errorSetTimeRef = useRef<number>(0)
  const lastNotifiedTurnRef = useRef<number>(-1)

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
      const newGameState = data.gameState as GameState

      if (data.roomStyleId) {
        setRoomStyleId(data.roomStyleId)
      }

      if (newGameState.phase === "playing") {
        const currentPlayerIndex = newGameState.currentPlayerIndex
        const currentPlayer = newGameState.players[currentPlayerIndex]
        const isMyTurn = currentPlayer?.id === playerId

        // Only notify once per turn change
        if (isMyTurn && lastNotifiedTurnRef.current !== currentPlayerIndex) {
          lastNotifiedTurnRef.current = currentPlayerIndex
          showTurnNotification(playerName, roomCode)
          playTurnSound()
        }
      }

      setGameState(newGameState)
      if (Date.now() - errorSetTimeRef.current > 3000) {
        setError(null)
      }
      setIsLoading(false)
    } catch (err) {
      // If room not found, clear cookie and redirect
      if (err instanceof Error && err.message.includes("not found")) {
        await clearPlayerCookie(roomCode)
        router.push("/")
      }
    } finally {
      isPollingRef.current = false
    }
  }, [roomCode, playerId, playerName, apiCall, router])

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

  const setErrorWithTimestamp = useCallback((errorMsg: string) => {
    errorSetTimeRef.current = Date.now()
    setError(errorMsg)
  }, [])

  // Game actions
  const startGame = useCallback(async () => {
    try {
      await apiCall({ action: "start_game", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to start game")
    }
  }, [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const playTiles = useCallback(
    async (melds: Meld[], hand: Tile[], workingArea: Tile[] = []) => {
      try {
        await apiCall({ action: "play_tiles", roomCode, playerId, melds, hand, workingArea })
        pollGameState()
      } catch (err) {
        setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to play tiles")
      }
    },
    [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp],
  )

  const drawTile = useCallback(async (): Promise<Tile | null> => {
    if (queueMode) {
      console.log("[v0] ERROR: drawTile() called in queue mode - this should never happen!")
      console.log("[v0] Queue mode actions should be handled in components, not here")
      return null
    }

    try {
      const data = await apiCall({ action: "draw_tile", roomCode, playerId })
      pollGameState()
      return data.drawnTile || null
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to draw tile")
      return null
    }
  }, [queueMode, roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const endTurn = useCallback(async () => {
    try {
      await apiCall({ action: "end_turn", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to end turn")
    }
  }, [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const resetTurn = useCallback(async () => {
    try {
      await apiCall({ action: "reset_turn", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to reset turn")
    }
  }, [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const endGame = useCallback(async () => {
    try {
      await apiCall({ action: "end_game", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to end game")
    }
  }, [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const changeRoomStyle = useCallback(
    async (styleId: RoomStyleId) => {
      try {
        await apiCall({ action: "change_room_style", roomCode, playerId, styleId })
        setRoomStyleId(styleId)
      } catch (err) {
        setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to change room style")
      }
    },
    [roomCode, playerId, apiCall, setErrorWithTimestamp],
  )

  const bootPlayer = useCallback(
    async (targetPlayerId: string) => {
      try {
        await apiCall({ action: "boot_player", roomCode, playerId, targetPlayerId })
        pollGameState()
      } catch (err) {
        setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to boot player")
      }
    },
    [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp],
  )

  const queueTurn = useCallback(
    async (plannedMelds: Meld[], plannedHand: Tile[], plannedWorkingArea: Tile[]) => {
      console.log("[v0] Queueing turn:", {
        roomCode,
        playerId: playerId.slice(0, 8),
        meldsCount: plannedMelds.length,
        handSize: plannedHand.length,
        workingAreaSize: plannedWorkingArea.length,
      })

      try {
        await apiCall({
          action: "queue_turn",
          roomCode,
          playerId,
          plannedMelds,
          plannedHand,
          plannedWorkingArea,
        })
        pollGameState()
        setQueueMode(false)
        setQueuedGameState(null)

        console.log("[v0] Turn queued successfully")
      } catch (err) {
        console.error("[v0] Queue turn failed:", err)
        setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to queue turn")
      }
    },
    [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp],
  )

  const clearQueuedTurn = useCallback(async () => {
    console.log("[v0] Clearing queued turn:", { roomCode, playerId: playerId.slice(0, 8) })

    try {
      await apiCall({ action: "clear_queued_turn", roomCode, playerId })
      pollGameState()
      console.log("[v0] Queued turn cleared successfully")
    } catch (err) {
      console.error("[v0] Clear queued turn failed:", err)
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to clear queued turn")
    }
  }, [roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const handleToggleQueueMode = useCallback(
    (enabled: boolean) => {
      console.log("[v0] Toggling queue mode:", { enabled, roomCode, playerId: playerId.slice(0, 8) })

      if (enabled && gameState) {
        const myPlayer = gameState.players.find((p) => p.id === playerId)
        if (myPlayer) {
          setQueuedGameState({
            melds: JSON.parse(JSON.stringify(gameState.melds)),
            hand: JSON.parse(JSON.stringify(myPlayer.hand)),
            workingArea: JSON.parse(JSON.stringify(gameState.workingArea)),
          })
        }
      } else {
        setQueuedGameState(null)
      }

      setQueueMode(enabled)
    },
    [gameState, playerId, roomCode],
  )

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

    await clearPlayerCookie(roomCode)
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
        roomStyleId={roomStyleId}
        isHost={isHost}
        onStartGame={startGame}
        onLeave={disconnect}
        onChangeRoomStyle={changeRoomStyle}
        onBootPlayer={bootPlayer}
      />
    )
  }

  // Game ended
  if (gameState.phase === "ended") {
    return (
      <GameEndScreen
        gameState={gameState}
        playerId={playerId}
        roomStyleId={roomStyleId}
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
        roomStyleId={roomStyleId}
        onPlayTiles={playTiles}
        onDrawTile={drawTile}
        onEndTurn={endTurn}
        onResetTurn={resetTurn}
        onEndGame={endGame}
        onQueueTurn={queueTurn}
        onClearQueuedTurn={clearQueuedTurn}
        queueMode={queueMode}
        onToggleQueueMode={handleToggleQueueMode}
        queuedGameState={queuedGameState}
        onUpdateQueuedState={setQueuedGameState}
        error={error}
      />
    )
  }

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      roomCode={roomCode}
      roomStyleId={roomStyleId}
      isHost={isHost}
      onPlayTiles={playTiles}
      onDrawTile={drawTile}
      onEndTurn={endTurn}
      onResetTurn={resetTurn}
      onEndGame={endGame}
      onChangeRoomStyle={changeRoomStyle}
      onQueueTurn={queueTurn}
      onClearQueuedTurn={clearQueuedTurn}
      queueMode={queueMode}
      onToggleQueueMode={handleToggleQueueMode}
      queuedGameState={queuedGameState}
      onUpdateQueuedState={setQueuedGameState}
      error={error}
    />
  )
}
