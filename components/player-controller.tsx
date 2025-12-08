"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Hand,
  Layers,
  Plus,
  X,
  Download,
  Send,
  AlertCircle,
  Users,
  Wrench,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
} from "lucide-react"
import type { GameState, Meld, Tile, RoomStyleId } from "@/lib/game-types"
import { STANDARD_MELD_POINTS, ROOM_STYLES } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { MeldDisplay } from "@/components/meld-display"
import { DrawnTileModal } from "@/components/drawn-tile-modal"
import { EndGameModal } from "@/components/end-game-modal"
import { PlayerCodeDisplay } from "@/components/player-code-display"
import { SettingsModal } from "@/components/settings-modal"
import { generateId, isValidMeld, calculateProcessedMeldPoints, processMeld } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface PlayerControllerProps {
  gameState: GameState
  playerId: string
  roomCode: string
  roomStyleId: RoomStyleId
  isHost: boolean
  onPlayTiles: (melds: Meld[], hand: Tile[], workingArea: Tile[]) => void
  onDrawTile: () => Promise<Tile | null>
  onEndTurn: () => void
  onResetTurn: () => void
  onEndGame: () => void
  onChangeRoomStyle: (styleId: RoomStyleId) => void
  error?: string | null
}

export function PlayerController({
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
  error,
}: PlayerControllerProps) {
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set())
  const [selectedWorkingTiles, setSelectedWorkingTiles] = useState<Set<string>>(new Set())
  const [showPlayers, setShowPlayers] = useState(false)
  const [drawnTile, setDrawnTile] = useState<Tile | null>(null)
  const [handExpanded, setHandExpanded] = useState(true)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myPlayer = gameState.players.find((p) => p.id === playerId)
  const isMyTurn = currentPlayer?.id === playerId
  const myHand = myPlayer?.hand || []
  const workingArea = gameState.workingArea || []
  const canUseTableTiles = myPlayer?.hasInitialMeld ?? false
  const myPlayerCode = myPlayer?.playerCode

  const currentStyle = ROOM_STYLES[roomStyleId]

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

    const newMelds = [...gameState.melds, newMeld]
    onPlayTiles(newMelds, remainingHand, remainingWorking)
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [myHand, workingArea, selectedTiles, selectedWorkingTiles, gameState.melds, onPlayTiles])

  const addToMeld = useCallback(
    (meldId: string) => {
      if (allSelectedTiles.length === 0) return

      const remainingHand = myHand.filter((t) => !selectedTiles.has(t.id))
      const remainingWorking = workingArea.filter((t) => !selectedWorkingTiles.has(t.id))

      const updatedMelds = gameState.melds.map((m) => {
        if (m.id === meldId) {
          return { ...m, tiles: [...m.tiles, ...allSelectedTiles] }
        }
        return m
      })

      onPlayTiles(updatedMelds, remainingHand, remainingWorking)
      setSelectedTiles(new Set())
      setSelectedWorkingTiles(new Set())
    },
    [myHand, workingArea, selectedTiles, selectedWorkingTiles, gameState.melds, onPlayTiles],
  )

  const takeTileFromMeld = useCallback(
    (tileId: string, meldId: string) => {
      if (!canUseTableTiles) return

      const meld = gameState.melds.find((m) => m.id === meldId)
      if (!meld) return

      const tile = meld.tiles.find((t) => t.id === tileId)
      if (!tile) return

      const updatedMelds = gameState.melds
        .map((m) => {
          if (m.id === meldId) {
            return { ...m, tiles: m.tiles.filter((t) => t.id !== tileId) }
          }
          return m
        })
        .filter((m) => m.tiles.length > 0)

      onPlayTiles(updatedMelds, myHand, [...workingArea, tile])

      setSelectedWorkingTiles((prev) => new Set([...prev, tileId]))
    },
    [canUseTableTiles, gameState.melds, myHand, workingArea, onPlayTiles],
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

    onPlayTiles(gameState.melds, [...myHand, ...tilesToReturn], tilesToKeep)
    setSelectedWorkingTiles(new Set())
  }, [workingArea, selectedWorkingTiles, gameState.turnStartHand, gameState.melds, myHand, onPlayTiles])

  const breakMeld = useCallback(
    (meldId: string) => {
      if (!canUseTableTiles) return

      const meld = gameState.melds.find((m) => m.id === meldId)
      if (!meld) return

      const updatedMelds = gameState.melds.filter((m) => m.id !== meldId)
      onPlayTiles(updatedMelds, myHand, [...workingArea, ...meld.tiles])

      setSelectedWorkingTiles((prev) => new Set([...prev, ...meld.tiles.map((t) => t.id)]))
    },
    [canUseTableTiles, gameState.melds, myHand, workingArea, onPlayTiles],
  )

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [])

  const handleDrawTile = useCallback(async () => {
    const tile = await onDrawTile()
    if (tile) {
      setDrawnTile(tile)
    }
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [onDrawTile])

  const handleResetTurn = useCallback(() => {
    onResetTurn()
    setSelectedTiles(new Set())
    setSelectedWorkingTiles(new Set())
  }, [onResetTurn])

  const wouldBeValidMeld = allSelectedTiles.length >= 3 && isValidMeld({ id: "temp", tiles: allSelectedTiles })

  const totalNewPoints = gameState.melds
    .filter((m) => isValidMeld(m))
    .reduce((sum, m) => sum + calculateProcessedMeldPoints(processMeld(m)), 0)

  const totalSelected = selectedTiles.size + selectedWorkingTiles.size

  const initialMeldThreshold = gameState.rules?.initialMeldThreshold ?? STANDARD_MELD_POINTS

  const hasChangesToReset =
    workingArea.length > 0 ||
    myHand.length !== gameState.turnStartHand.length ||
    !myHand.every((t) => gameState.turnStartHand.some((st) => st.id === t.id))

  const lastSeenTileIds = new Set(myPlayer?.lastSeenMeldTileIds || [])

  const newTileIds = new Set<string>()
  gameState.melds.forEach((meld) => {
    meld.tiles.forEach((tile) => {
      if (!lastSeenTileIds.has(tile.id)) {
        newTileIds.add(tile.id)
      }
    })
  })

  return (
    <div className={cn("h-dvh flex flex-col overflow-hidden", currentStyle.background)}>
      <DrawnTileModal tile={drawnTile} onClose={() => setDrawnTile(null)} />
      <EndGameModal isOpen={showEndGameModal} onClose={() => setShowEndGameModal(false)} onConfirm={onEndGame} />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        roomStyleId={roomStyleId}
        onStyleChange={onChangeRoomStyle}
        isHost={isHost}
      />

      <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Rummikub</h1>
          <Badge variant="secondary" className="font-mono text-xs">
            {roomCode}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {myPlayerCode && <PlayerCodeDisplay playerCode={myPlayerCode} />}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowSettingsModal(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowEndGameModal(true)}
          >
            <LogOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2" onClick={() => setShowPlayers(!showPlayers)}>
            <Users className="w-4 h-4" />
            {gameState.players.length}
          </Button>
          <span className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            {gameState.tilePool.length}
          </span>
          <span className="flex items-center gap-1">
            <Hand className="w-4 h-4" />
            {myHand.length}
          </span>
        </div>
      </header>

      <div
        className={cn(
          "flex-shrink-0 py-2 px-4 text-center text-sm font-medium transition-colors",
          isMyTurn ? "bg-primary/20 text-primary" : "bg-secondary/20 text-muted-foreground",
        )}
      >
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
            {"Waiting for"} <strong>{currentPlayer?.name}</strong>
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
                <span className="opacity-70">
                  {(player as unknown as { handCount?: number }).handCount ?? player.hand.length}
                </span>
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
              Table ({gameState.melds.length})
            </h3>
            {!canUseTableTiles && isMyTurn && (
              <Badge variant="outline" className="text-xs">
                First turn: hand only
              </Badge>
            )}
          </div>

          {gameState.melds.length === 0 ? (
            <Card className="p-4 border-dashed border-2 bg-transparent">
              <p className="text-muted-foreground text-center text-xs">No melds yet - select tiles to create one</p>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              {gameState.melds.map((meld) => (
                <MeldDisplay
                  key={meld.id}
                  meld={meld}
                  isInteractive={isMyTurn && canUseTableTiles}
                  hasSelectedTiles={totalSelected > 0}
                  onTileClick={isMyTurn && canUseTableTiles ? takeTileFromMeld : undefined}
                  onAddTile={isMyTurn ? addToMeld : undefined}
                  onDeleteMeld={isMyTurn && canUseTableTiles ? breakMeld : undefined}
                  compact
                  newTileIds={newTileIds}
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
            >
              <Hand className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Your Hand ({myHand.length})
              </h3>
              {handExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {totalSelected > 0 && isMyTurn && (
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

          {handExpanded && (
            <>
              {!myPlayer?.hasInitialMeld && (
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
                      size="md"
                      selected={selectedTiles.has(tile.id)}
                      onClick={isMyTurn ? () => toggleTileSelection(tile.id) : undefined}
                    />
                  ))}

                  {sortedHand.length === 0 && <p className="text-muted-foreground text-sm py-2">No tiles in hand</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isMyTurn && (
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
            <Button
              variant="outline"
              className="flex-1 h-12 gap-2 bg-transparent text-base cursor-pointer active:scale-95 transition-transform hover:bg-secondary/50"
              onClick={handleDrawTile}
            >
              <Download className="w-5 h-5" />
              Draw & Pass
            </Button>
            <Button
              className="flex-1 h-12 gap-2 text-base cursor-pointer active:scale-95 transition-transform"
              onClick={onEndTurn}
            >
              <Send className="w-5 h-5" />
              End Turn
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
