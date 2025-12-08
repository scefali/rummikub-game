"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Share2, Crown, Users, Loader2, Check, Info } from "lucide-react"
import { useState } from "react"
import type { GameState, RoomStyleId } from "@/lib/game-types"
import { MIN_PLAYERS, MAX_PLAYERS, LARGE_GAME_THRESHOLD, getRulesForPlayerCount, ROOM_STYLES } from "@/lib/game-types"
import { PlayerCodeDisplay } from "@/components/player-code-display"
import { RoomStyleSelector } from "@/components/room-style-selector"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface LobbyScreenProps {
  roomCode: string
  playerId: string
  gameState: GameState
  roomStyleId: RoomStyleId
  isHost: boolean
  onStartGame: () => void
  onLeave: () => void
  onChangeRoomStyle: (styleId: RoomStyleId) => void
}

export function LobbyScreen({
  roomCode,
  playerId,
  gameState,
  roomStyleId,
  isHost,
  onStartGame,
  onLeave,
  onChangeRoomStyle,
}: LobbyScreenProps) {
  const [linkCopied, setLinkCopied] = useState(false)
  const isMobile = useIsMobile()

  const currentPlayer = gameState.players.find((p) => p.id === playerId)
  const myPlayerCode = currentPlayer?.playerCode
  const canStart = gameState.players.length >= MIN_PLAYERS

  const currentRules = getRulesForPlayerCount(gameState.players.length)
  const isLargeGame = currentRules.mode === "large"

  const currentStyle = ROOM_STYLES[roomStyleId]

  const shareGameLink = async () => {
    const gameUrl = `${window.location.origin}/game/${roomCode}`

    // Try native share API first (works great on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Rummikub game!",
          text: `Join my Rummikub game!`,
          url: gameUrl,
        })
        return
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }

    // Fall back to clipboard
    try {
      await navigator.clipboard.writeText(gameUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      const textArea = document.createElement("textarea")
      textArea.value = gameUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-4", currentStyle.background)}>
      {/* Room Code Display */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-lg text-muted-foreground">Room Code</CardTitle>
            <Badge variant="outline" className={cn("text-xs", currentStyle.accent)}>
              {currentStyle.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-5xl font-mono font-bold tracking-[0.3em] text-primary">{roomCode}</span>
          </div>

          {/* Room Style Selector - only for host on desktop */}
          {isHost && !isMobile && (
            <div className="mb-4">
              <RoomStyleSelector currentStyleId={roomStyleId} onStyleChange={onChangeRoomStyle} />
            </div>
          )}

          {/* Share Game Link Button - now primary and more prominent */}
          <Button onClick={shareGameLink} className="gap-2 w-full mb-4">
            {linkCopied ? (
              <>
                <Check className="w-4 h-4" />
                Link Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Invite Link
              </>
            )}
          </Button>

          {myPlayerCode && (
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Your player code (for cross-device login):</p>
              <PlayerCodeDisplay playerCode={myPlayerCode} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className={`w-full max-w-md mb-6 ${isLargeGame ? "bg-amber-500/10 border-amber-500/30" : "bg-card/80 border-border/50"}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className={`w-5 h-5 ${isLargeGame ? "text-amber-500" : "text-muted-foreground"}`} />
            <CardTitle className={`text-lg ${isLargeGame ? "text-amber-500" : "text-foreground"}`}>
              {isLargeGame ? "Large Game Rules" : "Standard Rules"}
            </CardTitle>
            {isLargeGame && <Badge className="bg-amber-500 text-amber-950">5-6 Players</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className={isLargeGame ? "text-amber-200/80" : "text-muted-foreground"}>
              {isLargeGame ? (
                <>
                  <strong>{gameState.players.length} players detected.</strong> Each player starts with{" "}
                  <strong>{currentRules.startingHandSize} tiles</strong>, and your first meld only needs{" "}
                  <strong>{currentRules.initialMeldThreshold} points</strong> instead of 30.
                </>
              ) : (
                <>
                  {gameState.players.length}-
                  {Math.min(gameState.players.length + (MAX_PLAYERS - gameState.players.length), 4)} players. Each
                  player starts with <strong>{currentRules.startingHandSize} tiles</strong>. First meld must total at
                  least <strong>{currentRules.initialMeldThreshold} points</strong>.
                </>
              )}
            </p>
            {!isLargeGame && gameState.players.length < LARGE_GAME_THRESHOLD && (
              <p className="text-xs text-muted-foreground/70">
                Add {LARGE_GAME_THRESHOLD - gameState.players.length} more player(s) for Large Game Rules (12 tiles, 25
                pts).
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Players List */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players
            </CardTitle>
            <Badge variant="secondary">
              {gameState.players.length} / {MAX_PLAYERS}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  player.id === playerId ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {player.name}
                      {player.id === playerId && <span className="text-muted-foreground text-sm ml-1">(you)</span>}
                    </span>
                  </div>
                </div>
                {player.isHost && (
                  <Badge variant="default" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Host
                  </Badge>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: MAX_PLAYERS - gameState.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center p-3 rounded-lg bg-secondary/10 border border-dashed border-border/50"
              >
                <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
                <span className="ml-3 text-muted-foreground text-sm">Waiting for player...</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3">
        {isHost ? (
          <>
            <Button onClick={onStartGame} disabled={!canStart} className="w-full h-12 text-lg font-semibold">
              {canStart ? "Start Game" : `Need ${MIN_PLAYERS - gameState.players.length} more player(s)`}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {canStart ? "All players are ready!" : `Waiting for at least ${MIN_PLAYERS} players to start`}
            </p>
          </>
        ) : (
          <div className="text-center p-4 rounded-lg bg-secondary/20">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-muted-foreground">Waiting for host to start the game...</p>
          </div>
        )}

        <Button variant="ghost" onClick={onLeave} className="w-full text-muted-foreground">
          Leave Room
        </Button>
      </div>
    </div>
  )
}
