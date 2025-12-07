"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus } from "lucide-react"
import type { Meld } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { isValidMeld, calculateMeldPoints } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface MeldDisplayProps {
  meld: Meld
  onTileClick?: (tileId: string, meldId: string) => void
  onAddTile?: (meldId: string) => void
  onDeleteMeld?: (meldId: string) => void
  isInteractive?: boolean
  hasSelectedTiles?: boolean
}

export function MeldDisplay({
  meld,
  onTileClick,
  onAddTile,
  onDeleteMeld,
  isInteractive = false,
  hasSelectedTiles = false,
}: MeldDisplayProps) {
  const isValid = isValidMeld(meld)
  const points = calculateMeldPoints(meld.tiles)

  return (
    <Card
      className={cn(
        "inline-flex flex-col gap-2 p-2 bg-secondary/30 border-2 transition-all",
        isValid ? "border-primary/30" : "border-destructive/50 shake",
      )}
    >
      {/* Tiles row */}
      <div className="flex gap-1">
        {meld.tiles.map((tile) => (
          <GameTile
            key={tile.id}
            tile={tile}
            size="md"
            onClick={isInteractive ? () => onTileClick?.(tile.id, meld.id) : undefined}
          />
        ))}
      </div>

      {/* Info and actions row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          {isValid ? (
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
              {points} pts
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Invalid
            </Badge>
          )}
        </div>

        {isInteractive && (
          <div className="flex items-center gap-1">
            {hasSelectedTiles && onAddTile && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => onAddTile(meld.id)}
                title="Add selected tiles"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            {onDeleteMeld && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDeleteMeld(meld.id)}
                title="Return tiles to hand"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
