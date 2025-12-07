"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hand, Layers, Plus, X, Download, Send, AlertCircle, Users } from "lucide-react"
import type { GameState, Meld, Tile } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { MeldDisplay } from "@/components/meld-display"
import { generateId, isValidMeld, calculateMeldPoints } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface PlayerControllerProps {
  gameState: GameState
  playerId: string
  roomCode: string
  onPlayTiles: (melds: Meld[], hand: Tile[]) => void
  onDrawTile: () => void
  onEndTurn: () => void
  error?: string | null
}

export function PlayerController({
  gameState,
  playerId,
  roomCode,
  onPlayTiles,
  onDrawTile,
  onEndTurn,
  error,
}: PlayerControllerProps) {
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("hand")

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myPlayer = gameState.players.find((p) => p.id === playerId)
  const isMyTurn = currentPlayer?.id === playerId
  const myHand = myPlayer?.hand || []

  // Sort tiles by color, then by number
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

  const handleDrawTile = useCallback(() => {
    onDrawTile()
    setSelectedTiles(new Set())
  }, [onDrawTile])

  // Check if selection would be valid
  const selectedTileObjects = myHand.filter((t) => selectedTiles.has(t.id))
  const wouldBeValidMeld = selectedTiles.size >= 3 && isValidMeld({ id: "temp", tiles: selectedTileObjects })

  // Calculate points for initial meld requirement display
  const totalNewPoints = gameState.melds
    .filter((m) => isValidMeld(m))
    .reduce((sum, m) => sum + calculateMeldPoints(m.tiles), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Rummikub</h1>
          <Badge variant="secondary" className="font-mono text-xs">
            {roomCode}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

      {/* Turn Indicator */}
      <div
        className={cn(
          "py-2 px-4 text-center text-sm font-medium transition-colors",
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

      {/* Error Banner */}
      {error && (
        <div className="py-2 px-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border/50 bg-transparent h-12">
          <TabsTrigger
            value="hand"
            className="gap-2 data-[state=active]:bg-secondary/30 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Hand className="w-4 h-4" />
            Hand
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="gap-2 data-[state=active]:bg-secondary/30 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Layers className="w-4 h-4" />
            Table
          </TabsTrigger>
          <TabsTrigger
            value="players"
            className="gap-2 data-[state=active]:bg-secondary/30 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Users className="w-4 h-4" />
            Players
          </TabsTrigger>
        </TabsList>

        {/* Hand Tab */}
        <TabsContent value="hand" className="flex-1 flex flex-col m-0 p-4 overflow-auto">
          {/* Selection Actions */}
          {selectedTiles.size > 0 && isMyTurn && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm text-muted-foreground flex-1">{selectedTiles.size} selected</span>
              <Button
                size="sm"
                variant={wouldBeValidMeld ? "default" : "secondary"}
                onClick={createMeld}
                disabled={selectedTiles.size < 3}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                {wouldBeValidMeld ? "Meld" : "Min 3"}
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Tiles Grid */}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 justify-center">
              {sortedTiles.map((tile) => (
                <GameTile
                  key={tile.id}
                  tile={tile}
                  size="lg"
                  selected={selectedTiles.has(tile.id)}
                  onClick={isMyTurn ? () => toggleTileSelection(tile.id) : undefined}
                />
              ))}

              {sortedTiles.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tiles in hand</p>
                </div>
              )}
            </div>
          </div>

          {/* Initial Meld Hint */}
          {!myPlayer?.hasInitialMeld && (
            <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg text-center">
              <p className="text-sm text-accent-foreground">
                First move: Create melds totaling at least <strong>30 points</strong>
                {totalNewPoints > 0 && (
                  <span className="block mt-1 text-primary">Current: {totalNewPoints} points</span>
                )}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Table Tab - Made interactive */}
        <TabsContent value="table" className="flex-1 m-0 p-4 overflow-auto">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Melds on Table ({gameState.melds.length})
          </h3>

          {gameState.melds.length === 0 ? (
            <Card className="p-8 border-dashed border-2 bg-transparent">
              <p className="text-muted-foreground text-center text-sm">No melds on the table yet</p>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-3">
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
            </div>
          )}
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players" className="flex-1 m-0 p-4 overflow-auto">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Players ({gameState.players.length})
          </h3>

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        {player.name}
                        {player.id === playerId && <span className="text-muted-foreground text-xs ml-1">(you)</span>}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {(player as unknown as { handCount?: number }).handCount ?? player.hand.length} tiles
                        {player.hasInitialMeld && " • Started"}
                      </div>
                    </div>
                  </div>
                  {index === gameState.currentPlayerIndex && (
                    <Badge variant="default" className="text-xs">
                      Playing
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Bar */}
      {isMyTurn && (
        <div className="p-4 border-t border-border/50 bg-card/50">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 gap-2 bg-transparent" onClick={handleDrawTile}>
              <Download className="w-5 h-5" />
              Draw & Pass
            </Button>
            <Button className="flex-1 h-12 gap-2" onClick={onEndTurn}>
              <Send className="w-5 h-5" />
              End Turn
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
