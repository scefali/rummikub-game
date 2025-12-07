"use client"

import { useState, useCallback } from "react"
import type { Tile, Meld } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { Button } from "@/components/ui/button"
import { generateId } from "@/lib/game-logic"
import { Plus, X } from "lucide-react"

interface PlayerHandProps {
  tiles: Tile[]
  isMyTurn: boolean
  melds: Meld[]
  onPlayTiles: (melds: Meld[], hand: Tile[]) => void
}

export function PlayerHand({ tiles, isMyTurn, melds, onPlayTiles }: PlayerHandProps) {
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set())

  // Sort tiles by color, then by number
  const sortedTiles = [...tiles].sort((a, b) => {
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

    const selectedTileObjects = tiles.filter((t) => selectedTiles.has(t.id))
    const remainingTiles = tiles.filter((t) => !selectedTiles.has(t.id))

    const newMeld: Meld = {
      id: generateId(),
      tiles: selectedTileObjects,
    }

    const newMelds = [...melds, newMeld]
    onPlayTiles(newMelds, remainingTiles)
    setSelectedTiles(new Set())
  }, [selectedTiles, tiles, melds, onPlayTiles])

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set())
  }, [])

  return (
    <div>
      {/* Selection Actions */}
      {selectedTiles.size > 0 && isMyTurn && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-muted-foreground">{selectedTiles.size} tiles selected</span>
          <Button size="sm" variant="default" onClick={createMeld} disabled={selectedTiles.size < 3} className="gap-1">
            <Plus className="w-4 h-4" />
            Create Meld
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1">
            <X className="w-4 h-4" />
            Clear
          </Button>
        </div>
      )}

      {/* Hand */}
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
  )
}
