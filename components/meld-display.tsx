"use client"

import { Card } from "@/components/ui/card"
import type { Meld } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"

interface MeldDisplayProps {
  meld: Meld
  onTileClick?: (tileId: string) => void
  isInteractive?: boolean
}

export function MeldDisplay({ meld, onTileClick, isInteractive = false }: MeldDisplayProps) {
  return (
    <Card className="inline-flex gap-1 p-2 bg-secondary/30 border-border/50">
      {meld.tiles.map((tile) => (
        <GameTile
          key={tile.id}
          tile={tile}
          size="md"
          onClick={isInteractive ? () => onTileClick?.(tile.id) : undefined}
        />
      ))}
    </Card>
  )
}
