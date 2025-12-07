"use client"

import { useState, useCallback } from "react"
import type { Tile, Meld } from "@/lib/game-types"
import { GameTile } from "@/components/game-tile"
import { MeldDisplay } from "@/components/meld-display"
import { Button } from "@/components/ui/button"
import { generateId, isValidMeld } from "@/lib/game-logic"
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

  const addToMeld = useCallback(
    (meldId: string) => {
      if (selectedTiles.size === 0) return

      const selectedTileObjects = tiles.filter((t) => selectedTiles.has(t.id))
      const remainingTiles = tiles.filter((t) => !selectedTiles.has(t.id))

      const updatedMelds = melds.map((m) => {
        if (m.id === meldId) {
          return { ...m, tiles: [...m.tiles, ...selectedTileObjects] }
        }
        return m
      })

      onPlayTiles(updatedMelds, remainingTiles)
      setSelectedTiles(new Set())
    },
    [selectedTiles, tiles, melds, onPlayTiles],
  )

  const removeTileFromMeld = useCallback(
    (tileId: string, meldId: string) => {
      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const tile = meld.tiles.find((t) => t.id === tileId)
      if (!tile) return

      const updatedMelds = melds
        .map((m) => {
          if (m.id === meldId) {
            return { ...m, tiles: m.tiles.filter((t) => t.id !== tileId) }
          }
          return m
        })
        .filter((m) => m.tiles.length > 0)

      onPlayTiles(updatedMelds, [...tiles, tile])
    },
    [melds, tiles, onPlayTiles],
  )

  const deleteMeld = useCallback(
    (meldId: string) => {
      const meld = melds.find((m) => m.id === meldId)
      if (!meld) return

      const updatedMelds = melds.filter((m) => m.id !== meldId)
      onPlayTiles(updatedMelds, [...tiles, ...meld.tiles])
    },
    [melds, tiles, onPlayTiles],
  )

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set())
  }, [])

  // Check if current selection would make a valid meld
  const selectedTileObjects = tiles.filter((t) => selectedTiles.has(t.id))
  const wouldBeValidMeld = selectedTiles.size >= 3 && isValidMeld({ id: "temp", tiles: selectedTileObjects })

  return (
    <div>
      {/* Selection Actions */}
      {selectedTiles.size > 0 && isMyTurn && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-secondary/30 rounded-lg">
          <span className="text-sm text-muted-foreground">{selectedTiles.size} tiles selected</span>
          <Button
            size="sm"
            variant={wouldBeValidMeld ? "default" : "secondary"}
            onClick={createMeld}
            disabled={selectedTiles.size < 3}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            {wouldBeValidMeld ? "Create Meld" : "Create (min 3)"}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Hand */}
      <div className="flex flex-wrap gap-2 mb-4">
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

      {isMyTurn && melds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Melds on Table (click tiles to return to hand)
          </h4>
          <div className="flex flex-wrap gap-2">
            {melds.map((meld) => (
              <MeldDisplay
                key={meld.id}
                meld={meld}
                isInteractive={true}
                hasSelectedTiles={selectedTiles.size > 0}
                onTileClick={removeTileFromMeld}
                onAddTile={addToMeld}
                onDeleteMeld={deleteMeld}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
