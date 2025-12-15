"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import type { GameState, Meld, Tile } from "@/lib/game-types"

interface PendingQueuedChanges {
  melds: Meld[]
  hand: Tile[]
  workingArea: Tile[]
}

type GameAction =
  | { type: "createMeld"; tiles: Tile[] }
  | { type: "addToMeld"; meldId: string; tiles: Tile[] }
  | { type: "breakMeld"; meldId: string }
  | { type: "splitMeld"; meldId: string; splitIndex: number }
  | { type: "drawTile" }
  | { type: "updateState"; melds: Meld[]; hand: Tile[]; workingArea: Tile[] }

interface QueueModeContextValue {
  queueMode: boolean
  effectiveGameState: GameState | null
  effectiveMelds: Meld[]
  effectiveHand: Tile[]
  effectiveWorkingArea: Tile[]
  dispatchAction: (action: GameAction) => void
  enterQueueMode: () => void
  exitQueueMode: () => void
  getPendingChanges: () => PendingQueuedChanges | null
  hasQueuedTurn: () => boolean
}

const QueueModeContext = createContext<QueueModeContextValue | undefined>(undefined)

interface QueueModeProviderProps {
  children: ReactNode
  gameState: GameState | null
  playerId: string
}

export function QueueModeProvider({ children, gameState, playerId }: QueueModeProviderProps) {
  console.log("[v0] QueueModeProvider: rendering", {
    gameState: gameState ? `exists (revision ${gameState.revision})` : "null",
    playerId: playerId.slice(0, 8),
  })

  const [queueMode, setQueueMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingQueuedChanges | null>(null)
  const [savedBaseRevision, setSavedBaseRevision] = useState<number>(0)

  const effectiveGameState = useMemo((): GameState | null => {
    if (!gameState) {
      console.log("[v0] QueueModeProvider: gameState is null, returning null")
      return null
    }

    if (!queueMode || !pendingChanges) {
      console.log("[v0] QueueModeProvider: not in queue mode, returning base gameState")
      return gameState
    }

    if (gameState.revision !== savedBaseRevision) {
      console.log("[v0] Base game state changed during queue mode. Invalidating pending changes.", {
        savedRevision: savedBaseRevision,
        currentRevision: gameState.revision,
      })
      setPendingChanges(null)
      setQueueMode(false)
      return gameState
    }

    const myPlayer = gameState.players.find((p) => p.id === playerId)
    if (!myPlayer) {
      console.log("[v0] QueueModeProvider: myPlayer not found in gameState")
      return gameState
    }

    console.log("[v0] QueueModeProvider: returning effective gameState with pending changes")
    return {
      ...gameState,
      melds: pendingChanges.melds,
      workingArea: [],
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

  const dispatchAction = useCallback(
    (action: GameAction) => {
      if (!queueMode) {
        console.error("[v0] dispatchAction called in normal mode - this is a bug")
        return
      }

      console.log("[v0] Queue action dispatched:", action.type)

      setPendingChanges((prev) => {
        if (!prev) return null

        switch (action.type) {
          case "updateState":
            return {
              melds: action.melds,
              hand: action.hand,
              workingArea: action.workingArea,
            }

          case "drawTile":
            return {
              ...prev,
              hand: [
                ...prev.hand,
                {
                  id: `queued-draw-${Date.now()}`,
                  number: 0,
                  color: "black",
                  isJoker: false,
                },
              ],
            }

          default:
            console.warn("[v0] Unhandled action type:", action.type)
            return prev
        }
      })
    },
    [queueMode],
  )

  const enterQueueMode = useCallback(() => {
    console.log("[v0] Entering queue mode")
    if (!gameState) {
      console.log("[v0] Cannot enter queue mode: gameState is null")
      return
    }

    const myPlayer = gameState.players.find((p) => p.id === playerId)
    if (!myPlayer) {
      console.log("[v0] Cannot enter queue mode: myPlayer not found")
      return
    }

    console.log("[v0] Queue mode entered successfully, revision:", gameState.revision)
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

  const getPendingChanges = useCallback(() => {
    return pendingChanges
  }, [pendingChanges])

  const hasQueuedTurn = useCallback(() => {
    if (!gameState) return false
    const myPlayer = gameState.players.find((p) => p.id === playerId)
    return !!myPlayer?.queuedTurn
  }, [gameState, playerId])

  console.log("[v0] QueueModeProvider: providing context", {
    queueMode,
    effectiveGameState: effectiveGameState ? "exists" : "null",
    effectiveMeldsCount: effectiveMelds.length,
    effectiveHandCount: effectiveHand.length,
  })

  return (
    <QueueModeContext.Provider
      value={{
        queueMode,
        effectiveGameState,
        effectiveMelds,
        effectiveHand,
        effectiveWorkingArea,
        dispatchAction,
        enterQueueMode,
        exitQueueMode,
        getPendingChanges,
        hasQueuedTurn,
      }}
    >
      {children}
    </QueueModeContext.Provider>
  )
}

export function useQueueMode() {
  const context = useContext(QueueModeContext)
  if (context === undefined) {
    console.error("[v0] useQueueMode called outside QueueModeProvider")
    throw new Error("useQueueMode must be used within a QueueModeProvider")
  }
  return context
}
