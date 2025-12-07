"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus } from "lucide-react"
import type { Meld } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { isValidMeld, calculateMeldPoints, processMeld } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface MeldDisplayProps {
  meld: Meld
  onTileClick?: (tileId: string, meldId: string) => void
  onAddTile?: (meldId: string) => void
  onDeleteMeld?: (meldId: string) => void
  isInteractive?: boolean
  hasSelectedTiles?: boolean
  compact?: boolean
}

export function MeldDisplay({
  meld,
  onTileClick,
  onAddTile,
  onDeleteMeld,
  isInteractive = false,
  hasSelectedTiles = false,
  compact = false,
}: MeldDisplayProps) {
  const isValid = isValidMeld(meld)
  const points = calculateMeldPoints(meld.tiles)
  const processedMeld = isValid ? processMeld(meld) : meld

  return (
    <Card
      className={cn(
        "inline-flex flex-col gap-1.5 bg-secondary/30 border-2 transition-all",
        compact ? "p-1.5" : "p-2",
        isValid ? "border-primary/30" : "border-destructive/50 shake",
        isInteractive && "hover:border-primary/50",
      )}
    >
      {/* Tiles row */}
      <div className="flex gap-0.5">
        {processedMeld.tiles.map((tile) => (
          <GameTile
            key={tile.id}
            tile={tile}
            size={compact ? "sm" : "md"}
            onClick={isInteractive ? () => onTileClick?.(tile.id, meld.id) : undefined}
            showAssigned={tile.isJoker && isValid}
          />
        ))}
      </div>

      {/* Info and actions row */}
      <div className="flex items-center justify-between gap-1 px-0.5">
        <div className="flex items-center gap-1">
          {isValid ? (
            <Badge
              variant="secondary"
              className={cn("bg-primary/20 text-primary", compact ? "text-[10px] px-1.5 py-0" : "text-xs")}
            >
              {points} pts
            </Badge>
          ) : (
            <Badge variant="destructive" className={cn(compact ? "text-[10px] px-1.5 py-0" : "text-xs")}>
              Invalid
            </Badge>
          )}
        </div>

        {isInteractive && (
          <div className="flex items-center gap-0.5">
            {hasSelectedTiles && onAddTile && (
              <Button
                size="icon"
                variant="ghost"
                className={cn("text-primary cursor-pointer hover:bg-primary/20", compact ? "h-7 w-7" : "h-6 w-6")}
                onClick={() => onAddTile(meld.id)}
                title="Add selected tiles"
              >
                <Plus className={compact ? "h-4 w-4" : "h-3 w-3"} />
              </Button>
            )}
            {onDeleteMeld && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "text-destructive cursor-pointer hover:text-destructive hover:bg-destructive/20",
                  compact ? "h-7 w-7" : "h-6 w-6",
                )}
                onClick={() => onDeleteMeld(meld.id)}
                title="Return tiles to working area"
              >
                <Trash2 className={compact ? "h-4 w-4" : "h-3 w-3"} />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
