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
import { useQueueMode } from "@/lib/queue-mode-context"
import { QueueModeProvider } from "@/lib/queue-mode-context"
import type { GameState, Meld, Tile, RoomStyleId } from "@/lib/game-types"
import { Loader2 } from "lucide-react"

interface GameClientProps {
  roomCode: string
  playerId: string
  playerName: string
}

interface GameClientInnerProps extends GameClientProps {
  gameState: GameState | null
  setGameState: (state: GameState | null) => void
}

function GameClientInner({ roomCode, playerId, playerName, gameState, setGameState }: GameClientInnerProps) {
  const { queueMode, dispatchAction, enterQueueMode, exitQueueMode, getPendingChanges, hasQueuedTurn } = useQueueMode()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [roomStyleId, setRoomStyleId] = useState<RoomStyleId>("classic")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      if (queueMode) {
        console.log("[v0] Queueing tile play")
        dispatchAction({ type: "updateState", melds, hand, workingArea })
        return
      }

      try {
        await apiCall({ action: "play_tiles", roomCode, playerId, melds, hand, workingArea })
        pollGameState()
      } catch (err) {
        setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to play tiles")
      }
    },
    [queueMode, dispatchAction, roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp],
  )

  const drawTile = useCallback(async (): Promise<Tile | null> => {
    if (queueMode) {
      console.log("[v0] Queueing tile draw")
      dispatchAction({ type: "drawTile" })
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
  }, [queueMode, dispatchAction, roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const endTurn = useCallback(async () => {
    if (queueMode) {
      console.log("[v0] Queueing turn end")
      dispatchAction({ type: "endTurn" })
      return
    }

    try {
      await apiCall({ action: "end_turn", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to end turn")
    }
  }, [queueMode, dispatchAction, roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

  const resetTurn = useCallback(async () => {
    if (queueMode) {
      console.log("[v0] Resetting queue mode changes")
      // Re-enter queue mode to reset to base state
      exitQueueMode()
      enterQueueMode()
      return
    }

    try {
      await apiCall({ action: "reset_turn", roomCode, playerId })
      pollGameState()
    } catch (err) {
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to reset turn")
    }
  }, [queueMode, enterQueueMode, exitQueueMode, roomCode, playerId, apiCall, pollGameState, setErrorWithTimestamp])

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

  const queueTurn = useCallback(async () => {
    const pending = getPendingChanges()
    if (!pending) {
      console.error("[v0] No pending changes to queue")
      return
    }

    console.log("[v0] Queueing turn:", {
      roomCode,
      playerId: playerId.slice(0, 8),
      meldsCount: pending.melds.length,
      handSize: pending.hand.length,
      workingAreaSize: pending.workingArea.length,
    })

    try {
      await apiCall({
        action: "queue_turn",
        roomCode,
        playerId,
        plannedMelds: pending.melds,
        plannedHand: pending.hand,
        plannedWorkingArea: pending.workingArea,
      })
      pollGameState()
      exitQueueMode()
      console.log("[v0] Turn queued successfully")
    } catch (err) {
      console.error("[v0] Queue turn failed:", err)
      setErrorWithTimestamp(err instanceof Error ? err.message : "Failed to queue turn")
    }
  }, [roomCode, playerId, apiCall, pollGameState, exitQueueMode, getPendingChanges, setErrorWithTimestamp])

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

      if (enabled) {
        if (hasQueuedTurn()) {
          console.log("[v0] Player already has a queued turn")
          // Don't enter queue mode, show the viewer instead
          return
        }
        enterQueueMode()
      } else {
        exitQueueMode()
      }
    },
    [hasQueuedTurn, enterQueueMode, exitQueueMode, roomCode, playerId],
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
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Reconnecting to game...</p>
      </div>
    )
  }

  // Determine current view
  const currentPlayer = gameState?.players.find((p) => p.id === playerId)
  const isHost = currentPlayer?.isHost ?? false

  // In lobby
  if (gameState?.phase === "lobby") {
    return (
      <LobbyScreen
        roomCode={roomCode}
        playerId={playerId}
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
  if (gameState?.phase === "ended") {
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
        onToggleQueueMode={handleToggleQueueMode}
        error={error}
      />
    )
  }

  return (
    <GameBoard
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
      onToggleQueueMode={handleToggleQueueMode}
      error={error}
    />
  )
}

function GameClientWithProvider({ roomCode, playerId, playerName }: GameClientProps) {
  console.log("[v0] GameClientWithProvider: rendering", { roomCode, playerId: playerId.slice(0, 8), playerName })
  const [gameState, setGameState] = useState<GameState | null>(null)

  console.log("[v0] GameClientWithProvider: gameState =", gameState ? "exists" : "null")

  return (
    <QueueModeProvider gameState={gameState} playerId={playerId}>
      <GameClientInner
        roomCode={roomCode}
        playerId={playerId}
        playerName={playerName}
        gameState={gameState}
        setGameState={setGameState}
      />
    </QueueModeProvider>
  )
}

export { GameClientWithProvider as GameClient }
