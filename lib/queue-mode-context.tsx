"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import type { GameState, Meld, Tile } from "@/lib/game-types"

interface PendingQueuedChanges {
  melds: Meld[]
  hand: Tile[]
  workingArea: Tile[]
}

interface QueueModeContextValue {
  queueMode: boolean
  effectiveGameState: GameState | null
  effectiveMelds: Meld[]
  effectiveHand: Tile[]
  effectiveWorkingArea: Tile[]
  // Queue mode controls
  enterQueueMode: () => void
  exitQueueMode: () => void
  // Update pending changes locally
  updatePendingChanges: (changes: Partial<PendingQueuedChanges>) => void
  // Get the pending changes to submit
  getPendingChanges: () => PendingQueuedChanges | null
  // Clear everything
  clearPendingChanges: () => void
}

const QueueModeContext = createContext<QueueModeContextValue | undefined>(undefined)

interface QueueModeProviderProps {
  children: ReactNode
  gameState: GameState | null
  playerId: string
}

export function QueueModeProvider({ children, gameState, playerId }: QueueModeProviderProps) {
  const [queueMode, setQueueMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingQueuedChanges | null>(null)
  const [savedBaseRevision, setSavedBaseRevision] = useState<number>(0)

  const effectiveGameState = useMemo((): GameState | null => {
    if (!gameState) return null

    // In normal mode, just return the real game state
    if (!queueMode || !pendingChanges) {
      return gameState
    }

    if (gameState.revision !== savedBaseRevision) {
      console.log("[v0] Base game state changed during queue mode. Invalidating pending changes.", {
        savedRevision: savedBaseRevision,
        currentRevision: gameState.revision,
      })
      // Clear pending changes and exit queue mode
      setPendingChanges(null)
      setQueueMode(false)
      return gameState
    }

    const myPlayer = gameState.players.find((p) => p.id === playerId)
    if (!myPlayer) return gameState

    return {
      ...gameState,
      // Use pending melds instead of real melds
      melds: pendingChanges.melds,
      workingArea: [],
      // Update my hand in players array
      players: gameState.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              hand: pendingChanges.hand,
            }
          : p,
      ),
    }
  }, [gameState, queueMode, pendingChanges, playerId, savedBaseRevision])

  const effectiveMelds = useMemo(() => {
    if (!queueMode || !pendingChanges) {
      return gameState?.melds || []
    }
    return pendingChanges.melds
  }, [queueMode, pendingChanges, gameState])

  const effectiveHand = useMemo(() => {
    if (!queueMode || !pendingChanges) {
      const myPlayer = gameState?.players.find((p) => p.id === playerId)
      return myPlayer?.hand || []
    }
    return pendingChanges.hand
  }, [queueMode, pendingChanges, gameState, playerId])

  const effectiveWorkingArea = useMemo(() => {
    if (!queueMode || !pendingChanges) {
      return gameState?.workingArea || []
    }
    return pendingChanges.workingArea
  }, [queueMode, pendingChanges, gameState])

  const enterQueueMode = useCallback(() => {
    console.log("[v0] Entering queue mode")
    if (!gameState) return

    const myPlayer = gameState.players.find((p) => p.id === playerId)
    if (!myPlayer) return

    setPendingChanges({
      melds: JSON.parse(JSON.stringify(gameState.melds)),
      hand: JSON.parse(JSON.stringify(myPlayer.hand)),
      workingArea: JSON.parse(JSON.stringify(gameState.workingArea)),
    })
    setSavedBaseRevision(gameState.revision)
    setQueueMode(true)
  }, [gameState, playerId])

  const exitQueueMode = useCallback(() => {
    console.log("[v0] Exiting queue mode")
    setQueueMode(false)
    setPendingChanges(null)
    setSavedBaseRevision(0)
  }, [])

  const updatePendingChanges = useCallback((changes: Partial<PendingQueuedChanges>) => {
    setPendingChanges((prev) => {
      if (!prev) return null
      return { ...prev, ...changes }
    })
  }, [])

  const getPendingChanges = useCallback(() => {
    return pendingChanges
  }, [pendingChanges])

  const clearPendingChanges = useCallback(() => {
    setPendingChanges(null)
  }, [])

  return (
    <QueueModeContext.Provider
      value={{
        queueMode,
        effectiveGameState,
        effectiveMelds,
        effectiveHand,
        effectiveWorkingArea,
        enterQueueMode,
        exitQueueMode,
        updatePendingChanges,
        getPendingChanges,
        clearPendingChanges,
      }}
    >
      {children}
    </QueueModeContext.Provider>
  )
}

export function useQueueMode() {
  const context = useContext(QueueModeContext)
  if (context === undefined) {
    throw new Error("useQueueMode must be used within a QueueModeProvider")
  }
  return context
}
