"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Layers, Users, ArrowRight, AlertCircle } from "lucide-react"
import type { GameState, Meld, Tile } from "@/lib/game-types"
import { MeldDisplay } from "@/components/meld-display"
import { PlayerHand } from "@/components/player-hand"
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
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myPlayer = gameState.players.find((p) => p.id === playerId)
  const isMyTurn = currentPlayer?.id === playerId

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
              <MeldDisplay key={meld.id} meld={meld} />
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

      {/* My Hand (Host also plays) */}
      {myPlayer && (
        <div className="border-t border-border/50 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Hand</h3>
            <div className="flex gap-2">
              {isMyTurn && (
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
          <PlayerHand tiles={myPlayer.hand} isMyTurn={isMyTurn} melds={gameState.melds} onPlayTiles={onPlayTiles} />
        </div>
      )}
    </div>
  )
}
