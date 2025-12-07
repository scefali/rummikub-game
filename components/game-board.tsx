"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Layers, Users, ArrowRight, AlertCircle, Plus, X } from "lucide-react"
import type { GameState, Meld, Tile } from "@/lib/game-types"
import { MeldDisplay } from "@/components/meld-display"
import { GameTile } from "@/components/game-tile"
import { generateId, isValidMeld } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface GameBoardProps {
  gameState: GameState
  playerId: string
  roomCode: string
  onPlayTiles: (melds: Meld[], hand: Tile[]) => void
  onDrawTile: () => void
  onEndTurn: () => void
  error?: string | null
}

export function GameBoard({
  gameState,
  playerId,
  roomCode,
  onPlayTiles,
  onDrawTile,
  onEndTurn,
  error,
}: GameBoardProps) {
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set())

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myPlayer = gameState.players.find((p) => p.id === playerId)
  const isMyTurn = currentPlayer?.id === playerId
  const myHand = myPlayer?.hand || []

  // Sort tiles
  const sortedTiles = [...myHand].sort((a, b) => {
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

  const createMeld = useCallback(() => {
    if (selectedTiles.size < 3) return

    const selectedTileObjects = myHand.filter((t) => selectedTiles.has(t.id))
    const remainingTiles = myHand.filter((t) => !selectedTiles.has(t.id))

    const newMeld: Meld = {
      id: generateId(),
      tiles: selectedTileObjects,
    }

    const newMelds = [...gameState.melds, newMeld]
    onPlayTiles(newMelds, remainingTiles)
    setSelectedTiles(new Set())
  }, [selectedTiles, myHand, gameState.melds, onPlayTiles])

  const addToMeld = useCallback(
    (meldId: string) => {
      if (selectedTiles.size === 0) return

      const selectedTileObjects = myHand.filter((t) => selectedTiles.has(t.id))
      const remainingTiles = myHand.filter((t) => !selectedTiles.has(t.id))

      const updatedMelds = gameState.melds.map((m) => {
        if (m.id === meldId) {
          return { ...m, tiles: [...m.tiles, ...selectedTileObjects] }
        }
        return m
      })

      onPlayTiles(updatedMelds, remainingTiles)
      setSelectedTiles(new Set())
    },
    [selectedTiles, myHand, gameState.melds, onPlayTiles],
  )

  const removeTileFromMeld = useCallback(
    (tileId: string, meldId: string) => {
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

      onPlayTiles(updatedMelds, [...myHand, tile])
    },
    [gameState.melds, myHand, onPlayTiles],
  )

  const deleteMeld = useCallback(
    (meldId: string) => {
      const meld = gameState.melds.find((m) => m.id === meldId)
      if (!meld) return

      const updatedMelds = gameState.melds.filter((m) => m.id !== meldId)
      onPlayTiles(updatedMelds, [...myHand, ...meld.tiles])
    },
    [gameState.melds, myHand, onPlayTiles],
  )

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set())
  }, [])

  const selectedTileObjects = myHand.filter((t) => selectedTiles.has(t.id))
  const wouldBeValidMeld = selectedTiles.size >= 3 && isValidMeld({ id: "temp", tiles: selectedTileObjects })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">Rummikub</h1>
          <Badge variant="secondary" className="font-mono">
            {roomCode}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span className="text-sm">{gameState.tilePool.length} tiles left</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">{gameState.players.length} players</span>
          </div>
        </div>
      </header>

      {/* Turn Indicator */}
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
          </span>
        ) : (
          <span>
            {"Waiting for"} <strong>{currentPlayer?.name}</strong>
            {"'s turn..."}
          </span>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="py-2 px-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Main Game Area */}
      <div className="flex-1 flex">
        {/* Table / Melds Area */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">Table</h2>
            <p className="text-sm text-muted-foreground">
              {gameState.melds.length === 0
                ? "No melds on the table yet"
                : `${gameState.melds.length} meld${gameState.melds.length > 1 ? "s" : ""} on table`}
            </p>
          </div>

          {/* Melds Grid */}
          <div className="flex flex-wrap gap-4">
            {gameState.melds.map((meld) => (
              <MeldDisplay
                key={meld.id}
                meld={meld}
                isInteractive={isMyTurn}
                hasSelectedTiles={selectedTiles.size > 0}
                onTileClick={isMyTurn ? removeTileFromMeld : undefined}
                onAddTile={isMyTurn ? addToMeld : undefined}
                onDeleteMeld={isMyTurn ? deleteMeld : undefined}
              />
            ))}

            {gameState.melds.length === 0 && (
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

        {/* Players Sidebar */}
        <div className="w-64 border-l border-border/50 bg-card/30 p-4">
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
                  <span>{(player as unknown as { handCount?: number }).handCount ?? player.hand.length} tiles</span>
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

      {/* My Hand */}
      {myPlayer && (
        <div className="border-t border-border/50 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Hand</h3>
              {!myPlayer.hasInitialMeld && (
                <Badge variant="outline" className="text-xs">
                  Need 30+ pts for first meld
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {isMyTurn && selectedTiles.size > 0 && (
                <>
                  <Button
                    variant={wouldBeValidMeld ? "default" : "secondary"}
                    size="sm"
                    onClick={createMeld}
                    disabled={selectedTiles.size < 3}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {wouldBeValidMeld ? "Create Meld" : `Select ${3 - selectedTiles.size} more`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
              {isMyTurn && selectedTiles.size === 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={onDrawTile}>
                    Draw Tile
                  </Button>
                  <Button size="sm" onClick={onEndTurn}>
                    End Turn
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Hand tiles */}
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
