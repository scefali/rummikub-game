"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Hand,
  Layers,
  Plus,
  X,
  Download,
  AlertCircle,
  Wrench,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
  Clock,
  CheckCircle,
} from "lucide-react"
import type { GameState, Meld, Tile, RoomStyleId } from "@/lib/game-types"
import { ROOM_STYLES } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { MeldDisplay } from "@/components/meld-display"
import { DrawnTileModal } from "@/components/drawn-tile-modal"
import { EndGameModal } from "@/components/end-game-modal"
import { SettingsModal } from "@/components/settings-modal"
import { QueuedMoveViewer } from "@/components/queued-move-viewer"
import {
  generateId,
  isValidMeld,
  calculateProcessedMeldPoints,
  processMeld,
  findValidSplitPoint,
  calculateHandPoints,
  canEndTurn,
} from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface PlayerControllerProps {
  gameState: GameState
  playerId: string
  roomCode: string
  roomStyleId: RoomStyleId
  onPlayTiles: (melds: Meld[], hand: Tile[], workingArea: Tile[]) => void
  onDrawTile: () => Promise<Tile | null>
  onEndTurn: () => void
  onResetTurn: () => void
  onEndGame: () => void
  onQueueTurn: (plannedMelds: Meld[], plannedHand: Tile[], plannedWorkingArea: Tile[]) => Promise<void>
  onClearQueuedTurn: () => Promise<void>
  queueMode: boolean
  onToggleQueueMode: (enabled: boolean) => void
  queuedGameState: { melds: Meld[]; hand: Tile[]; workingArea: Tile[] } | null
  onUpdateQueuedState: (state: { melds: Meld[]; hand: Tile[]; workingArea: Tile[] } | null) => void
  error: string | null
}

export function PlayerController({
  gameState,
  playerId,
  roomCode,
  roomStyleId,
  onPlayTiles,
  onDrawTile,
  onEndTurn,
  onResetTurn,
  onEndGame,
  onQueueTurn,
  onClearQueuedTurn,
  queueMode,
  onToggleQueueMode,
  queuedGameState,
  onUpdateQueuedState,
  error,
}: PlayerControllerProps) {
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set())
  const [selectedWorkingTiles, setSelectedWorkingTiles] = useState<Set<string>>(new Set())
  const [showPlayers, setShowPlayers] = useState(false)
  const [drawnTile, setDrawnTile] = useState<Tile | null>(null)
  const [handExpanded, setHandExpanded] = useState(true)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showQueuedMoveViewer, setShowQueuedMoveViewer] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)

  const currentPlayerIndex = gameState.currentPlayerIndex
  const currentPlayer = gameState.players[currentPlayerIndex]
  const myPlayer = gameState.players.find((p) => p.id === playerId)!
  const isMyTurn = currentPlayer?.id === playerId || queueMode

  const myHand = queueMode && queuedGameState ? queuedGameState.hand : myPlayer.hand || []
  const workingArea = queueMode && queuedGameState ? queuedGameState.workingArea : gameState.workingArea || []
  const melds = queueMode && queuedGameState ? queuedGameState.melds : gameState.melds

  const currentStyle = ROOM_STYLES[roomStyleId]

  const allPlayersStarted = gameState.players.every((p) => p.hasInitialMeld)

  const sortedHand = [...myHand].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1
    if (!a.isJoker && b.isJoker) return -1
    if (a.color !== b.color) return a.color.localeCompare(b.color)
    return a.number - b.number
  })

  const sortedWorkingArea = [...workingArea].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1
    if (!a.isJoker && b.isJoker) return -1
    if (a.color !== b.color) return a.color.localeCompare(b.color)
    return a.number - b.number
  })

  const toggleTileSelection = useCallback((tileId: string) => {
    setSelectedTiles((prev) => {
      const next = new Set(prev)
      if (next.has(tileId)) {
        next.delete(tileId)
      } else {
        next.add(tileId)
      }
      return next
    })
  }, [])

  const toggleWorkingTileSelection = useCallback((tileId: string) => {
    setSelectedWorkingTiles((prev) => {
      const next = new Set(prev)
      if (next.has(tileId)) {
        next.delete(tileId)
      } else {
        next.add(tileId)
      }
      return next
    })
  }, [])

  const allSelectedTiles = [
    ...myHand.filter((t) => selectedTiles.has(t.id)),
    ...workingArea.filter((t) => selectedWorkingTiles.has(t.id)),
  ]

  const createMeld = useCallback(() => {
    if (allSelectedTiles.length < 3) return

    const remainingHand = myHand.filter((t) => !selectedTiles.has(t.id))
    const remainingWorking = workingArea.filter((t) => !selectedWorkingTiles.has(t.id))

    const newMeld: Meld = {
      id: generateId(),
      tiles: allSelectedTiles,
    }

    const newMelds = [...melds, newMeld]
    if (queueMode && onUpdateQueuedState) {
      onUpdateQueuedState({
        ...queuedGameState!,
        melds: newMelds,
        hand: remainingHand,
        workingArea: remainingWorking,
      })
    } else {
      onPlayTiles(newMelds, remainingHand, remainingWorking)
    }
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [
    myHand,
    workingArea,
    selectedTiles,
    selectedWorkingTiles,
    melds,
    onPlayTiles,
    queueMode,
    onUpdateQueuedState,
    queuedGameState,
  ])

  const addToMeld = useCallback(
    (meldId: string) => {
      if (allSelectedTiles.length === 0) return

      const remainingHand = myHand.filter((t) => !selectedTiles.has(t.id))
      const remainingWorking = workingArea.filter((t) => !selectedWorkingTiles.has(t.id))

      const updatedMelds = melds.map((m) => {
        if (m.id === meldId) {
          return { ...m, tiles: [...m.tiles, ...allSelectedTiles] }
        }
        return m
      })

      if (queueMode && onUpdateQueuedState) {
        onUpdateQueuedState({
          ...queuedGameState!,
          melds: updatedMelds,
          hand: remainingHand,
          workingArea: remainingWorking,
        })
      } else {
        onPlayTiles(updatedMelds, remainingHand, remainingWorking)
      }
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
    },
    [
      myHand,
      workingArea,
      selectedTiles,
      selectedWorkingTiles,
      melds,
      onPlayTiles,
      queueMode,
      onUpdateQueuedState,
      queuedGameState,
    ],
  )

  const takeTileFromMeld = useCallback(
    (tileId: string, meldId: string) => {
      if (!myPlayer.hasInitialMeld) return

      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const tile = meld.tiles.find((t) => t.id === tileId)
      if (!tile) return

      const updatedMelds = melds
        .map((m) => {
          if (m.id === meldId) {
            return { ...m, tiles: m.tiles.filter((t) => t.id !== tileId) }
          }
          return m
        })
        .filter((m) => m.tiles.length > 0)

      if (queueMode && onUpdateQueuedState) {
        onUpdateQueuedState({
          ...queuedGameState!,
          melds: updatedMelds,
          hand: [...myHand, tile],
          workingArea: workingArea.filter((t) => t.id !== tileId),
        })
      } else {
        onPlayTiles(
          updatedMelds,
          [...myHand, tile],
          workingArea.filter((t) => t.id !== tileId),
        )
      }

      setSelectedWorkingTiles((prev) => new Set([...prev, tileId]))
    },
    [myPlayer.hasInitialMeld, melds, myHand, workingArea, onPlayTiles, queueMode, onUpdateQueuedState, queuedGameState],
  )

  const returnSelectedToHand = useCallback(() => {
    const tilesToReturn: Tile[] = []
    const tilesToKeep: Tile[] = []

    workingArea.forEach((tile) => {
      if (selectedWorkingTiles.has(tile.id)) {
        const wasFromHand = gameState.turnStartHand.some((t) => t.id === tile.id)
        if (wasFromHand) {
          tilesToReturn.push(tile)
        } else {
          tilesToKeep.push(tile)
        }
      } else {
        tilesToKeep.push(tile)
      }
    })

    if (queueMode && onUpdateQueuedState) {
      onUpdateQueuedState({
        ...queuedGameState!,
        hand: [...myHand, ...tilesToReturn],
        workingArea: tilesToKeep,
      })
    } else {
      onPlayTiles(melds, [...myHand, ...tilesToReturn], tilesToKeep)
    }
    setSelectedWorkingTiles(new Set())
  }, [
    workingArea,
    selectedWorkingTiles,
    gameState.turnStartHand,
    melds,
    myHand,
    onPlayTiles,
    queueMode,
    onUpdateQueuedState,
    queuedGameState,
  ])

  const breakMeld = useCallback(
    (meldId: string) => {
      if (!myPlayer.hasInitialMeld) return

      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const updatedMelds = melds.filter((m) => m.id !== meldId)

      if (queueMode && onUpdateQueuedState) {
        onUpdateQueuedState({
          ...queuedGameState!,
          melds: updatedMelds,
          hand: [...myHand, ...meld.tiles],
          workingArea: workingArea,
        })
      } else {
        onPlayTiles(updatedMelds, [...myHand, ...meld.tiles], workingArea)
      }

      setSelectedWorkingTiles((prev) => new Set([...prev, ...meld.tiles.map((t) => t.id)]))
    },
    [myPlayer.hasInitialMeld, melds, myHand, workingArea, onPlayTiles, queueMode, onUpdateQueuedState, queuedGameState],
  )

  const splitMeld = useCallback(
    (meldId: string) => {
      if (!myPlayer.hasInitialMeld) return

      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const splitPoint = findValidSplitPoint(meld)
      if (splitPoint === null) return

      const processed = processMeld(meld)
      const firstPart = processed.tiles.slice(0, splitPoint)
      const secondPart = processed.tiles.slice(splitPoint)

      const updatedMelds = melds.filter((m) => m.id !== meldId)
      updatedMelds.push({ id: generateId(), tiles: firstPart })
      updatedMelds.push({ id: generateId(), tiles: secondPart })

      if (queueMode && onUpdateQueuedState) {
        onUpdateQueuedState({
          ...queuedGameState!,
          melds: updatedMelds,
          hand: myHand,
          workingArea: workingArea,
        })
      } else {
        onPlayTiles(updatedMelds, myHand, workingArea)
      }
    },
    [myPlayer.hasInitialMeld, melds, myHand, workingArea, onPlayTiles, queueMode, onUpdateQueuedState, queuedGameState],
  )

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [])

  const handleDrawTile = useCallback(async () => {
    if (queueMode && queuedGameState) {
      // In queue mode, simulate drawing a tile locally without calling API
      console.log("[v0] Queue mode: Simulating draw tile (no API call)")
      const simulatedTile: Tile = {
        id: `queued-draw-${Date.now()}-${Math.random()}`,
        number: 0, // Placeholder
        color: "black",
        isJoker: false,
      }

      onUpdateQueuedState({
        ...queuedGameState,
        hand: [...queuedGameState.hand, simulatedTile],
      })

      setDrawnTile(simulatedTile)
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
      return
    }

    // Normal mode: actually draw from API
    const tile = await onDrawTile()
    if (tile) {
      setDrawnTile(tile)
    }
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [queueMode, queuedGameState, onUpdateQueuedState, onDrawTile])

  const handleResetTurn = useCallback(() => {
    if (queueMode && onUpdateQueuedState) {
      const myPlayer = gameState.players.find((p) => p.id === playerId)
      if (myPlayer) {
        onUpdateQueuedState({
          melds: JSON.parse(JSON.stringify(gameState.melds)),
          hand: JSON.parse(JSON.stringify(myPlayer.hand)),
          workingArea: JSON.parse(JSON.stringify(gameState.workingArea)),
        })
      }
    } else {
      onResetTurn()
    }
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [queueMode, onUpdateQueuedState, gameState, playerId, onResetTurn])

  const wouldBeValidMeld = allSelectedTiles.length >= 3 && isValidMeld({ id: "temp", tiles: allSelectedTiles })

  const totalNewPoints = melds
    .filter((m) => isValidMeld(m))
    .reduce((sum, m) => sum + calculateProcessedMeldPoints(processMeld(m)), 0)

  const totalSelected = selectedTiles.size + selectedWorkingTiles.size

  const initialMeldThreshold = gameState.rules?.initialMeldThreshold ?? 30

  const hasChangesToReset =
    workingArea.length > 0 ||
    myHand.length !== gameState.turnStartHand.length ||
    !myHand.every((t) => gameState.turnStartHand.some((st) => st.id === t.id))

  const lastSeenTileIds = new Set(myPlayer.lastSeenMeldTileIds || [])

  const newTileIds = new Set<string>()
  melds.forEach((meld) => {
    meld.tiles.forEach((tile) => {
      if (!lastSeenTileIds.has(tile.id)) {
        newTileIds.add(tile.id)
      }
    })
  })

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
    }
  }, [isMyTurn])

  useEffect(() => {
    if (!isMyTurn) {
      clearSelection()
    }
  }, [isMyTurn, clearSelection])

  const handleEndTurn = useCallback(async () => {
    if (queueMode && queuedGameState) {
      console.log("[v0] Saving queued turn from player controller")
      await onQueueTurn(queuedGameState.melds, queuedGameState.hand, queuedGameState.workingArea)
      return
    }

    const validation = canEndTurn(myPlayer, melds, myHand, workingArea, gameState.rules!)
    if (!validation.canEnd) {
      return
    }

    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
    await onEndTurn()
    setHasPlayed(true)
  }, [queueMode, queuedGameState, onQueueTurn, myPlayer, melds, myHand, workingArea, gameState.rules, onEndTurn])

  const handleTileToBoard = useCallback(
    (tileIds: string[]) => {
      if (queueMode && queuedGameState) {
        const tiles = tileIds.map((id) => queuedGameState.hand.find((t) => t.id === id)!).filter(Boolean)
        const newWorkingArea = [...queuedGameState.workingArea, ...tiles]
        const newHand = queuedGameState.hand.filter((t) => !tileIds.includes(t.id))

        onUpdateQueuedState({
          ...queuedGameState,
          hand: newHand,
          workingArea: newWorkingArea,
        })
      } else {
        const tiles = tileIds.map((id) => myHand.find((t) => t.id === id)!).filter(Boolean)
        const newWorkingArea = [...workingArea, ...tiles]
        const newHand = myHand.filter((t) => !tileIds.includes(t.id))
        onPlayTiles(melds, newHand, newWorkingArea)
      }
      setSelectedTiles(new Set())
    },
    [queueMode, queuedGameState, onUpdateQueuedState, myHand, workingArea, melds, onPlayTiles],
  )

  const handleTileToHand = useCallback(
    (tileIds: string[]) => {
      if (queueMode && queuedGameState) {
        const tiles = tileIds.map((id) => queuedGameState.workingArea.find((t) => t.id === id)!).filter(Boolean)
        const newHand = [...queuedGameState.hand, ...tiles]
        const newWorkingArea = queuedGameState.workingArea.filter((t) => !tileIds.includes(t.id))

        onUpdateQueuedState({
          ...queuedGameState,
          hand: newHand,
          workingArea: newWorkingArea,
        })
      } else {
        const tiles = tileIds.map((id) => workingArea.find((t) => t.id === id)!).filter(Boolean)
        const newHand = [...myHand, ...tiles]
        const newWorkingArea = workingArea.filter((t) => !tileIds.includes(t.id))
        onPlayTiles(melds, newHand, newWorkingArea)
      }
      setSelectedWorkingTiles(new Set())
    },
    [queueMode, queuedGameState, onUpdateQueuedState, myHand, workingArea, melds, onPlayTiles],
  )

  const handleDrawAndPass = useCallback(async () => {
    if (queueMode && queuedGameState && onUpdateQueuedState) {
      // Queue mode: Just simulate the draw action locally, don't submit queue yet
      console.log("[v0] Queue mode: Simulating draw tile locally")
      const simulatedTile: Tile = {
        id: `queued-draw-${Date.now()}-${Math.random()}`,
        number: 0, // Placeholder - will be replaced with real tile when auto-played
        color: "black",
        isJoker: false,
      }

      onUpdateQueuedState({
        ...queuedGameState,
        hand: [...queuedGameState.hand, simulatedTile],
      })

      setDrawnTile(simulatedTile)
      console.log("[v0] Simulated tile added to queued hand. User must click 'Queue Move' to save.")
      return
    }

    // Normal mode: Draw from API and end turn
    console.log("[v0] Normal mode: Drawing tile from API and ending turn")
    const tile = await onDrawTile()
    if (tile) {
      setDrawnTile(tile)
    }
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
    await onEndTurn()
    setHasPlayed(true)
  }, [queueMode, queuedGameState, onUpdateQueuedState, onDrawTile, onEndTurn])

  const canEnd =
    isMyTurn && myPlayer.hasInitialMeld && canEndTurn(myPlayer, melds, myHand, workingArea, gameState.rules!).canEnd

  return (
    <div className={cn("min-h-screen flex flex-col", currentStyle.background)}>
      {queueMode && (
        <div className="bg-yellow-500/90 text-black px-3 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <Clock className="w-3 h-3" />
          Queue Mode - Planning your next turn
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleQueueMode(false)}
            className="ml-2 h-5 text-xs bg-black/20 hover:bg-black/30 px-2"
          >
            Exit
          </Button>
        </div>
      )}

      <div className="bg-card/95 backdrop-blur border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Rummikub</h1>
          <Badge variant="secondary" className="font-mono text-xs">
            {roomCode}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {!isMyTurn && !queueMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (myPlayer.queuedTurn) {
                  setShowQueuedMoveViewer(true)
                } else {
                  onToggleQueueMode(true)
                }
              }}
              className="h-7 px-2 relative"
            >
              <Clock className="w-3 h-3 mr-1" />
              Queue
              {myPlayer.queuedTurn && (
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px] leading-tight">
                  ✓
                </Badge>
              )}
            </Button>
          )}

          {myPlayer.queuedTurn && (
            <Button variant="ghost" size="sm" onClick={onClearQueuedTurn} className="h-7 px-2">
              <X className="w-3 h-3" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)} className="h-7 w-7">
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-shrink-0 py-2 px-4 text-center text-sm font-medium transition-colors">
        {isMyTurn ? (
          <span className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Your turn!
          </span>
        ) : (
          <span>
            {"Waiting for"} <strong>{currentPlayer.name}</strong>
          </span>
        )}
      </div>

      {error && (
        <div className="flex-shrink-0 py-2 px-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {showPlayers && (
        <div className="flex-shrink-0 p-3 bg-card/50 backdrop-blur-sm border-b border-border/50 max-h-40 overflow-auto">
          <div className="flex flex-wrap gap-2">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs flex items-center gap-2",
                  index === gameState.currentPlayerIndex
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-secondary/30 text-muted-foreground",
                  player.id === playerId && "ring-1 ring-primary/50",
                )}
              >
                <span className="font-medium">
                  {player.name}
                  {player.id === playerId && " (you)"}
                </span>
                <span className="opacity-70">{calculateHandPoints(player.hand)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-32 overflow-auto p-3 border-b border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Table ({melds.length})
            </h3>
            {!myPlayer.hasInitialMeld && isMyTurn && (
              <Badge variant="outline" className="text-xs">
                First turn: hand only
              </Badge>
            )}
          </div>

          {melds.length === 0 ? (
            <Card className="p-4 border-dashed border-2 bg-transparent">
              <p className="text-muted-foreground text-center text-xs">No melds yet - select tiles to create one</p>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {melds.map((meld) => (
                <MeldDisplay
                  key={meld.id}
                  meld={meld}
                  isInteractive={isMyTurn && myPlayer.hasInitialMeld}
                  hasSelectedTiles={totalSelected > 0}
                  onTileClick={isMyTurn && myPlayer.hasInitialMeld ? takeTileFromMeld : undefined}
                  onAddTile={isMyTurn ? addToMeld : undefined}
                  onDeleteMeld={isMyTurn && myPlayer.hasInitialMeld ? breakMeld : undefined}
                  onSplitMeld={isMyTurn && myPlayer.hasInitialMeld ? splitMeld : undefined}
                  compact
                  newTileIds={newTileIds}
                  hidePoints={allPlayersStarted}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex-shrink-0 border-b border-amber-500/30 p-3 transition-all duration-200",
            isMyTurn && workingArea.length > 0 ? "bg-amber-500/10 min-h-24" : "h-0 p-0 border-0 overflow-hidden",
          )}
        >
          {isMyTurn && workingArea.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                  Working Area ({workingArea.length})
                </h3>
              </div>

              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="flex gap-1.5 min-w-max">
                  {sortedWorkingArea.map((tile) => {
                    const wasFromHand = gameState.turnStartHand.some((t) => t.id === tile.id)
                    return (
                      <div key={tile.id} className="relative">
                        <GameTile
                          tile={tile}
                          size="sm"
                          selected={selectedWorkingTiles.has(tile.id)}
                          onClick={() => toggleWorkingTileSelection(tile.id)}
                        />
                        {!wasFromHand && (
                          <div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"
                            title="From table"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 bg-card/50 backdrop-blur-sm p-3 border-t border-border/30">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setHandExpanded(!handExpanded)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              disabled={queueMode}
            >
              <Hand className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Your Hand ({myHand.length})
              </h3>
              {!queueMode &&
                (handExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ))}
            </button>

            {totalSelected > 0 && (isMyTurn || queueMode) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{totalSelected} selected</span>
                <Button
                  size="sm"
                  variant={wouldBeValidMeld ? "default" : "secondary"}
                  onClick={createMeld}
                  disabled={allSelectedTiles.length < 3}
                  className="gap-1 h-7 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  {wouldBeValidMeld ? "Meld" : `+${3 - allSelectedTiles.length}`}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} className="h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {(handExpanded || queueMode) && (
            <>
              {!myPlayer.hasInitialMeld && (
                <div className="mb-2 py-1.5 px-3 bg-primary/20 border border-primary/30 rounded-md text-center">
                  <p className="text-xs text-foreground">
                    First move: melds totaling <strong>{initialMeldThreshold}+ pts</strong> from your hand only
                    {totalNewPoints > 0 && (
                      <span className="ml-2 text-primary font-semibold">({totalNewPoints} pts)</span>
                    )}
                  </p>
                </div>
              )}

              <div className="max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5 content-start">
                  {sortedHand.map((tile) => (
                    <GameTile
                      key={tile.id}
                      tile={tile}
                      size="sm"
                      selected={selectedTiles.has(tile.id)}
                      onClick={isMyTurn || queueMode ? () => toggleTileSelection(tile.id) : undefined}
                    />
                  ))}

                  {sortedHand.length === 0 && <p className="text-muted-foreground text-sm py-2">No tiles in hand</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {(isMyTurn || queueMode) && (
        <div className="flex-shrink-0 p-3 border-t border-border/50 bg-card/80 backdrop-blur-sm safe-area-pb">
          {hasChangesToReset && (
            <div className="flex justify-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={handleResetTurn}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Move
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            {isMyTurn && (
              <Button
                onClick={handleDrawAndPass}
                variant="outline"
                className="flex-1 h-12 gap-2 bg-transparent text-base cursor-pointer active:scale-95 transition-transform hover:bg-secondary/50"
                disabled={hasPlayed}
              >
                <Download className="w-5 h-5" />
                Draw & Pass
              </Button>
            )}
            <Button
              onClick={handleEndTurn}
              className="flex-1 h-12 gap-2 text-base cursor-pointer active:scale-95 transition-transform"
              disabled={!canEnd}
            >
              <CheckCircle className="w-5 h-5" />
              {queueMode ? "Queue Move" : "End Turn"}
            </Button>
          </div>
        </div>
      )}

      {myPlayer.queuedTurn && (
        <QueuedMoveViewer
          open={showQueuedMoveViewer}
          onOpenChange={setShowQueuedMoveViewer}
          queuedTurn={myPlayer.queuedTurn}
          onClearQueue={onClearQueuedTurn}
        />
      )}

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        roomStyleId={roomStyleId}
        onStyleChange={() => {}}
        isHost={false}
      />
      <EndGameModal isOpen={showEndGameModal} onClose={() => setShowEndGameModal(false)} onConfirm={onEndGame} />
      <DrawnTileModal tile={drawnTile} onClose={() => setDrawnTile(null)} />
    </div>
  )
}
