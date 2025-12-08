"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Scissors, MoreHorizontal } from "lucide-react"
import type { Meld } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { isValidMeld, calculateMeldPoints, processMeld, isValidRun } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface MeldDisplayProps {
  meld: Meld
  onTileClick?: (tileId: string, meldId: string) => void
  onAddTile?: (meldId: string) => void
  onDeleteMeld?: (meldId: string) => void
  onSplitMeld?: (meldId: string) => void
  isInteractive?: boolean
  hasSelectedTiles?: boolean
  compact?: boolean
  newTileIds?: Set<string>
  hidePoints?: boolean
}

export function MeldDisplay({
  meld,
  onTileClick,
  onAddTile,
  onDeleteMeld,
  onSplitMeld,
  isInteractive = false,
  hasSelectedTiles = false,
  compact = false,
  newTileIds,
  hidePoints = false,
}: MeldDisplayProps) {
  const [showActions, setShowActions] = useState(false)

  const isValid = isValidMeld(meld)
  const processedMeld = isValid ? processMeld(meld) : meld
  const points = calculateMeldPoints(processedMeld.tiles)

  const canSplit = isValid && isValidRun(meld.tiles) && meld.tiles.length >= 6
  const hasActions = isInteractive && (onDeleteMeld || (canSplit && onSplitMeld))

  const handleMeldClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on a tile or button
    if ((e.target as HTMLElement).closest("button")) return
    if (hasActions) {
      setShowActions(!showActions)
    }
  }

  return (
    <Card
      className={cn(
        "inline-flex flex-col bg-secondary/30 border-2 transition-all relative",
        compact ? "p-1 gap-0.5" : "p-2 gap-1.5",
        isValid ? "border-primary/30" : "border-destructive/50 shake",
        hasActions && "cursor-pointer hover:border-primary/50",
        showActions && "border-primary/70",
      )}
      onClick={handleMeldClick}
    >
      {/* Tiles row */}
      <div className="flex gap-px">
        {processedMeld.tiles.map((tile) => {
          const isNewTile = newTileIds?.has(tile.id)
          return (
            <div key={tile.id} className="relative">
              <GameTile
                tile={tile}
                size={compact ? "sm" : "md"}
                onClick={isInteractive ? () => onTileClick?.(tile.id, meld.id) : undefined}
                showAssigned={tile.isJoker && isValid}
              />
              {isNewTile && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-background"
                  title="Placed this turn"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Info and actions row - only show if there's something to display */}
      {(!hidePoints || !isValid || (isInteractive && hasSelectedTiles && onAddTile) || hasActions) && (
        <div className="flex items-center justify-between gap-0.5 px-0.5">
          <div className="flex items-center gap-1">
            {isValid ? (
              !hidePoints && (
                <Badge
                  variant="secondary"
                  className={cn("bg-primary/20 text-primary", compact ? "text-[9px] px-1 py-0 h-4" : "text-xs")}
                >
                  {points}
                </Badge>
              )
            ) : (
              <Badge variant="destructive" className={cn(compact ? "text-[9px] px-1 py-0 h-4" : "text-xs")}>
                Invalid
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            {isInteractive && hasSelectedTiles && onAddTile && (
              <Button
                size="icon"
                variant="ghost"
                className={cn("text-primary cursor-pointer hover:bg-primary/20", compact ? "h-5 w-5" : "h-6 w-6")}
                onClick={(e) => {
                  e.stopPropagation()
                  onAddTile(meld.id)
                }}
                title="Add selected tiles"
              >
                <Plus className={compact ? "h-3 w-3" : "h-3 w-3"} />
              </Button>
            )}
            {hasActions && !showActions && (
              <MoreHorizontal className={cn("text-muted-foreground", compact ? "h-3 w-3" : "h-4 w-4")} />
            )}
          </div>
        </div>
      )}

      {showActions && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-background/95 backdrop-blur-sm border rounded-lg p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {onDeleteMeld && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/20 gap-1"
              onClick={() => {
                onDeleteMeld(meld.id)
                setShowActions(false)
              }}
            >
              <Trash2 className="h-3 w-3" />
              <span className="text-[10px]">Break</span>
            </Button>
          )}
          {canSplit && onSplitMeld && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/20 gap-1"
              onClick={() => {
                onSplitMeld(meld.id)
                setShowActions(false)
              }}
            >
              <Scissors className="h-3 w-3" />
              <span className="text-[10px]">Split</span>
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
