"use client"

import { useState, useCallback, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, ArrowRight, AlertCircle, Plus, X, Wrench, ArrowLeft, RotateCcw, LogOut, Settings } from "lucide-react"
import type { GameState, Meld, Tile, RoomStyleId } from "@/lib/game-types"
import { ROOM_STYLES } from "@/lib/game-types"
import { MeldDisplay } from "@/components/meld-display"
import { GameTile } from "@/components/game-tile"
import { DrawnTileModal } from "@/components/drawn-tile-modal"
import { EndGameModal } from "@/components/end-game-modal"
import { SettingsModal } from "@/components/settings-modal"
import { QueuedMoveViewer } from "@/components/queued-move-viewer"
import {
  generateId,
  isValidMeld,
  processMeld,
  findValidSplitPoint,
  calculateHandPoints,
  canEndTurn,
} from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface GameBoardProps {
  gameState: GameState
  playerId: string
  roomCode: string
  roomStyleId: RoomStyleId
  isHost: boolean
  onPlayTiles: (melds: Meld[], hand: Tile[], workingArea?: Tile[]) => void
  onDrawTile: () => Promise<Tile | null>
  onEndTurn: () => void
  onResetTurn: () => void
  onEndGame: () => void
  onChangeRoomStyle: (styleId: RoomStyleId) => void
  onQueueTurn: (plannedMelds: Meld[], plannedHand: Tile[], plannedWorkingArea: Tile[]) => Promise<void>
  onClearQueuedTurn: () => Promise<void>
  queueMode: boolean
  onToggleQueueMode: (enabled: boolean) => void
  queuedGameState: { melds: Meld[]; hand: Tile[]; workingArea: Tile[] } | null
  onUpdateQueuedState: (state: { melds: Meld[]; hand: Tile[]; workingArea: Tile[] } | null) => void
  error: string | null
}

export function GameBoard({
  gameState,
  playerId,
  roomCode,
  roomStyleId,
  isHost,
  onPlayTiles,
  onDrawTile,
  onEndTurn,
  onResetTurn,
  onEndGame,
  onChangeRoomStyle,
  onQueueTurn,
  onClearQueuedTurn,
  queueMode,
  onToggleQueueMode,
  queuedGameState,
  onUpdateQueuedState,
  error,
}: GameBoardProps) {
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set())
  const [selectedWorkingTiles, setSelectedWorkingTiles] = useState<Set<string>>(new Set())
  const [drawnTile, setDrawnTile] = useState<Tile | null>(null)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showQueuedMoveViewer, setShowQueuedMoveViewer] = useState(false)

  const currentPlayerIndex = gameState.currentPlayerIndex
  const currentPlayer = gameState.players[currentPlayerIndex]
  const myPlayer = gameState.players.find((p) => p.id === playerId)!
  const isMyTurn = currentPlayer?.id === playerId || queueMode
  const myHand = queueMode && queuedGameState ? queuedGameState.hand : myPlayer.hand || []
  const workingArea = queueMode && queuedGameState ? queuedGameState.workingArea : gameState.workingArea || []
  const melds = queueMode && queuedGameState ? queuedGameState.melds : gameState.melds
  const canUseTableTiles = myPlayer.hasInitialMeld
  const initialMeldThreshold = gameState.rules?.initialMeldThreshold ?? 30

  const currentStyle = ROOM_STYLES[roomStyleId]

  const allPlayersStarted = gameState.players.every((p) => p.hasInitialMeld)

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
    }
  }, [isMyTurn])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedTiles(new Set())
        setSelectedWorkingTiles(new Set())
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const sortedTiles = [...myHand].sort((a, b) => {
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
    if (queueMode) {
      onUpdateQueuedState({ melds: newMelds, hand: remainingHand, workingArea: remainingWorking })
    } else {
      onPlayTiles(newMelds, remainingHand, remainingWorking)
    }
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [myHand, workingArea, selectedTiles, selectedWorkingTiles, melds, onPlayTiles, queueMode, onUpdateQueuedState])

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

      if (queueMode) {
        onUpdateQueuedState({ melds: updatedMelds, hand: remainingHand, workingArea: remainingWorking })
      } else {
        onPlayTiles(updatedMelds, remainingHand, remainingWorking)
      }
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
    },
    [myHand, workingArea, selectedTiles, selectedWorkingTiles, melds, onPlayTiles, queueMode, onUpdateQueuedState],
  )

  const takeTileFromMeld = useCallback(
    (tileId: string, meldId: string) => {
      if (!canUseTableTiles) return

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

      if (queueMode) {
        onUpdateQueuedState({ melds: updatedMelds, hand: [...myHand, tile], workingArea })
      } else {
        onPlayTiles(updatedMelds, myHand, [...workingArea, tile])
      }

      setSelectedWorkingTiles((prev) => new Set([...prev, tileId]))
    },
    [canUseTableTiles, melds, myHand, workingArea, onPlayTiles, queueMode, onUpdateQueuedState],
  )

  const breakMeld = useCallback(
    (meldId: string) => {
      if (!canUseTableTiles) return

      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const updatedMelds = melds.filter((m) => m.id !== meldId)

      if (queueMode) {
        onUpdateQueuedState({ melds: updatedMelds, hand: [...myHand, ...meld.tiles], workingArea })
      } else {
        onPlayTiles(updatedMelds, myHand, [...workingArea, ...meld.tiles])
      }

      setSelectedWorkingTiles((prev) => new Set([...prev, ...meld.tiles.map((t) => t.id)]))
    },
    [canUseTableTiles, melds, myHand, workingArea, onPlayTiles, queueMode, onUpdateQueuedState],
  )

  const splitMeld = useCallback(
    (meldId: string) => {
      if (!canUseTableTiles) return

      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const splitPoint = findValidSplitPoint(meld)
      if (splitPoint === null) return

      // Process to get correct tile order
      const processed = processMeld(meld)
      const firstPart = processed.tiles.slice(0, splitPoint)
      const secondPart = processed.tiles.slice(splitPoint)

      const updatedMelds = melds.filter((m) => m.id !== meldId)
      updatedMelds.push({ id: generateId(), tiles: firstPart })
      updatedMelds.push({ id: generateId(), tiles: secondPart })

      if (queueMode) {
        onUpdateQueuedState({ melds: updatedMelds, hand: myHand, workingArea })
      } else {
        onPlayTiles(updatedMelds, myHand, workingArea)
      }
    },
    [canUseTableTiles, melds, myHand, workingArea, onPlayTiles, queueMode, onUpdateQueuedState],
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

    if (queueMode) {
      onUpdateQueuedState({ melds, hand: [...myHand, ...tilesToReturn], workingArea: tilesToKeep })
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
  ])

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [])

  const handleDrawTile = useCallback(async () => {
    if (queueMode && queuedGameState && onUpdateQueuedState) {
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
    if (queueMode && onUpdateQueuedState && gameState) {
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

  const totalSelected = selectedTiles.size + selectedWorkingTiles.size
  const wouldBeValidMeld = allSelectedTiles.length >= 3 && isValidMeld({ id: "temp", tiles: allSelectedTiles })

  const hasChangesToReset =
    workingArea.length > 0 ||
    myHand.length !== gameState.turnStartHand.length ||
    !myHand.every((t) => gameState.turnStartHand.some((st) => st.id === t.id))

  const lastSeenTileIds = new Set(myPlayer.lastSeenMeldTileIds || [])

  const newTileIds = new Set<string>()
  gameState.melds.forEach((meld) => {
    meld.tiles.forEach((tile) => {
      if (!lastSeenTileIds.has(tile.id)) {
        newTileIds.add(tile.id)
      }
    })
  })

  const handleEndTurn = useCallback(async () => {
    if (queueMode && queuedGameState) {
      console.log("[v0] Saving queued turn from game board")
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
  }, [queueMode, queuedGameState, onQueueTurn, myPlayer, melds, myHand, workingArea, gameState.rules, onEndTurn])

  const handleDraw = useCallback(async () => {
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
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
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
  }, [queueMode, queuedGameState, onUpdateQueuedState, onDrawTile, onEndTurn])

  const canEnd = totalSelected === 0 || wouldBeValidMeld

  return (
    <div className={cn("min-h-screen flex flex-col", currentStyle.background)}>
      {queueMode && (
        <div className="bg-yellow-500/90 text-black px-4 py-2 text-center font-semibold flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Queue Mode Active - Planning your next move
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleQueueMode(false)}
            className="ml-2 h-6 bg-black/20 hover:bg-black/30"
          >
            Exit Queue Mode
          </Button>
        </div>
      )}

      <header className="border-b bg-card/95 backdrop-blur">
        <div className="container max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
                className="relative"
              >
                <Clock className="w-4 h-4 mr-1" />
                Queue Move
                {myPlayer.queuedTurn && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px] leading-tight">
                    ✓
                  </Badge>
                )}
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)}>
              <Settings className="w-4 h-4" />
            </Button>

            {myPlayer.queuedTurn && !queueMode && (
              <Button variant="ghost" size="sm" onClick={onClearQueuedTurn}>
                <X className="w-4 h-4 mr-1" />
                Clear Queue
              </Button>
            )}

            {isHost && (
              <Button variant="destructive" size="sm" onClick={onEndGame}>
                <LogOut className="w-4 h-4 mr-1" />
                End Game
              </Button>
            )}
          </div>
        </div>
      </header>

      <DrawnTileModal tile={drawnTile} onClose={() => setDrawnTile(null)} />
      <EndGameModal isOpen={showEndGameModal} onClose={() => setShowEndGameModal(false)} onConfirm={onEndGame} />
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        roomStyleId={roomStyleId}
        onStyleChange={onChangeRoomStyle}
        isHost={isHost}
      />

      {myPlayer.queuedTurn && (
        <QueuedMoveViewer
          open={showQueuedMoveViewer}
          onOpenChange={setShowQueuedMoveViewer}
          queuedTurn={myPlayer.queuedTurn}
          onClearQueue={onClearQueuedTurn}
        />
      )}

      <div
        className={cn(
          "py-3 px-4 text-center font-medium transition-colors",
          isMyTurn ? "bg-primary/20 text-primary" : "bg-secondary/20 text-muted-foreground",
        )}
      >
        {isMyTurn ? (
          <span className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            {"It's your turn!"}
            {!canUseTableTiles && <span className="text-sm opacity-80">(First meld: hand only)</span>}
          </span>
        ) : (
          <span>
            {"Waiting for"} <strong>{currentPlayer.name}</strong>
            {"'s turn..."}
          </span>
        )}
      </div>

      {error && (
        <div className="py-2 px-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex-1 flex">
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Table</h2>
              <p className="text-sm text-muted-foreground">
                {melds.length === 0
                  ? "No melds on the table yet"
                  : `${melds.length} meld${melds.length > 1 ? "s" : ""} on table`}
                {canUseTableTiles && isMyTurn && " - Click tiles to rearrange"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {melds.map((meld) => (
              <MeldDisplay
                key={meld.id}
                meld={meld}
                isInteractive={isMyTurn && canUseTableTiles}
                hasSelectedTiles={totalSelected > 0}
                onTileClick={isMyTurn && canUseTableTiles ? takeTileFromMeld : undefined}
                onAddTile={isMyTurn ? addToMeld : undefined}
                onDeleteMeld={isMyTurn && canUseTableTiles ? breakMeld : undefined}
                onSplitMeld={isMyTurn && canUseTableTiles ? splitMeld : undefined}
                newTileIds={newTileIds}
                hidePoints={allPlayersStarted} // Hide points when all players have started
              />
            ))}

            {melds.length === 0 && (
              <Card className="w-full max-w-md p-8 border-dashed border-2 bg-transparent flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  Place tiles here to create melds
                  <br />
                  <span className="text-sm">
                    Sets (same number, different colors) or Runs (consecutive, same color)
                  </span>
                </p>
              </Card>
            )}
          </div>
        </div>

        <div className="w-64 border-l border-border/50 bg-card/30 backdrop-blur-sm p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">Players</h3>
          <div className="space-y-3">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  "p-3 rounded-lg transition-all",
                  index === gameState.currentPlayerIndex
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-secondary/20 border border-transparent",
                  player.id === playerId && "ring-1 ring-primary/50",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    {player.name}
                    {player.id === playerId && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </span>
                  {index === gameState.currentPlayerIndex && <ArrowRight className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{calculateHandPoints(player.hand)} pts</span>
                  <span className="opacity-60">
                    ({(player as unknown as { handCount?: number }).handCount ?? player.hand.length} tiles)
                  </span>
                  {player.hasInitialMeld && (
                    <Badge variant="secondary" className="text-xs">
                      Started
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isMyTurn && workingArea.length > 0 && (
        <div className="border-t border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wide">
                Working Area ({workingArea.length})
              </h3>
              <span className="text-xs text-amber-500/70">Tiles picked up from the table</span>
            </div>
            {selectedWorkingTiles.size > 0 && (
              <Button variant="outline" size="sm" onClick={returnSelectedToHand} className="gap-1 bg-transparent">
                <ArrowLeft className="w-4 h-4" />
                Return to Hand
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {sortedWorkingArea.map((tile) => {
              const wasFromHand = gameState.turnStartHand.some((t) => t.id === tile.id)
              return (
                <div key={tile.id} className="relative">
                  <GameTile
                    tile={tile}
                    size="md"
                    selected={selectedWorkingTiles.has(tile.id)}
                    onClick={() => toggleWorkingTileSelection(tile.id)}
                  />
                  {!wasFromHand && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" title="From table" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {myPlayer && (
        <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Hand</h3>
              {!myPlayer.hasInitialMeld && (
                <Badge variant="default" className="text-xs">
                  Need {initialMeldThreshold}+ pts for first meld
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {(isMyTurn || queueMode) && (
                <>
                  {hasChangesToReset && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetTurn}
                      className="gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Move
                    </Button>
                  )}
                  <Button onClick={handleEndTurn} size="lg" disabled={!canEnd}>
                    {queueMode ? (
                      <>
                        <Clock className="w-4 h-4 mr-1" />
                        Queue Move
                      </>
                    ) : (
                      "End Turn"
                    )}
                  </Button>
                  {isMyTurn && totalSelected === 0 && canEnd && (
                    <Button onClick={handleDraw} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Draw & Pass
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sortedTiles.map((tile) => (
              <GameTile
                key={tile.id}
                tile={tile}
                size="md"
                selected={selectedTiles.has(tile.id)}
                onClick={isMyTurn ? () => toggleTileSelection(tile.id) : undefined}
              />
            ))}

            {sortedTiles.length === 0 && <p className="text-muted-foreground text-sm py-4">No tiles in hand</p>}
          </div>
        </div>
      )}
    </div>
  )
}
