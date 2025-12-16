"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, RotateCcw } from "lucide-react"
import type { GameState, RoomStyleId } from "@/lib/game-types"
import { ROOM_STYLES } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface GameEndScreenProps {
  gameState: GameState
  playerId: string
  roomStyleId: RoomStyleId
  onPlayAgain: () => void
}

export function GameEndScreen({ gameState, playerId, roomStyleId, onPlayAgain }: GameEndScreenProps) {
  const winner = gameState.players.find((p) => p.id === gameState.winner)
  const isWinner = gameState.winner === playerId

  const currentStyle = ROOM_STYLES[roomStyleId]

  // Calculate remaining points for each player
  const playerScores = gameState.players.map((player) => ({
    ...player,
    remainingPoints: player.hand.reduce((sum, tile) => sum + (tile.isJoker ? 30 : tile.number), 0),
  }))

  // Sort by remaining points (lowest = better)
  const sortedPlayers = [...playerScores].sort((a, b) => a.remainingPoints - b.remainingPoints)

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-4", currentStyle.background)}>
      {/* Winner Announcement */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">{isWinner ? "You Win!" : `${winner?.name} Wins!`}</h1>
        <p className="text-muted-foreground">
          {isWinner ? "Congratulations on your victory!" : "Better luck next time!"}
        </p>
      </div>

      {/* Scoreboard */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader>
          <CardTitle className="text-center">Final Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === playerId ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index === 0 ? <Medal className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="font-medium">
                    {player.name}
                    {player.id === playerId && <span className="text-muted-foreground text-sm ml-1">(you)</span>}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-sm">
                    {player.id === gameState.winner ? (
                      <span className="text-primary font-semibold">Winner!</span>
                    ) : (
                      `${player.remainingPoints} pts left`
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Play Again Button */}
      <Button onClick={onPlayAgain} className="h-12 px-8 text-lg font-semibold gap-2">
        <RotateCcw className="w-5 h-5" />
        Play Again
      </Button>
    </div>
  )
}
