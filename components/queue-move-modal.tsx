"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MeldDisplay } from "@/components/meld-display"
import { GameTile } from "@/components/game-tile"
import { Clock, CheckCircle2 } from "lucide-react"
import type { GameState, Player, Meld, Tile } from "@/lib/game-types"
import { generateId } from "@/lib/game-logic"

interface QueueMoveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameState: GameState
  currentPlayer: Player
  onSaveQueue: (plannedMelds: Meld[], plannedHand: Tile[], plannedWorkingArea: Tile[]) => Promise<void>
  onClearQueue: () => Promise<void>
}

export function QueueMoveModal({
  open,
  onOpenChange,
  gameState,
  currentPlayer,
  onSaveQueue,
  onClearQueue,
}: QueueMoveModalProps) {
  const [draftMelds, setDraftMelds] = useState<Meld[]>([])
  const [draftHand, setDraftHand] = useState<Tile[]>([])
  const [draftWorkingArea, setDraftWorkingArea] = useState<Tile[]>([])
  const [selectedHandTiles, setSelectedHandTiles] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Initialize draft state when modal opens
  useEffect(() => {
    if (open) {
      // If player has a queued turn, load it
      if (currentPlayer.queuedTurn) {
        setDraftMelds(JSON.parse(JSON.stringify(currentPlayer.queuedTurn.plannedMelds)))
        setDraftHand(JSON.parse(JSON.stringify(currentPlayer.queuedTurn.plannedHand)))
        setDraftWorkingArea(JSON.parse(JSON.stringify(currentPlayer.queuedTurn.plannedWorkingArea)))
      } else {
        // Initialize from current state
        setDraftMelds(JSON.parse(JSON.stringify(gameState.melds)))
        setDraftHand(JSON.parse(JSON.stringify(currentPlayer.hand)))
        setDraftWorkingArea([])
      }
      setSelectedHandTiles(new Set())
    }
  }, [open, gameState.melds, currentPlayer.hand, currentPlayer.queuedTurn])

  const handleTileClick = (tile: Tile) => {
    const newSelected = new Set(selectedHandTiles)
    if (newSelected.has(tile.id)) {
      newSelected.delete(tile.id)
    } else {
      newSelected.add(tile.id)
    }
    setSelectedHandTiles(newSelected)
  }

  const handleAddToWorkingArea = () => {
    const tilesToMove = draftHand.filter((t) => selectedHandTiles.has(t.id))
    setDraftWorkingArea([...draftWorkingArea, ...tilesToMove])
    setDraftHand(draftHand.filter((t) => !selectedHandTiles.has(t.id)))
    setSelectedHandTiles(new Set())
  }

  const handleCreateMeld = () => {
    if (draftWorkingArea.length >= 3) {
      const newMeld: Meld = {
        id: generateId(),
        tiles: [...draftWorkingArea],
      }
      setDraftMelds([...draftMelds, newMeld])
      setDraftWorkingArea([])
    }
  }

  const handleDeleteMeld = (meldId: string) => {
    const meld = draftMelds.find((m) => m.id === meldId)
    if (meld) {
      setDraftHand([...draftHand, ...meld.tiles])
      setDraftMelds(draftMelds.filter((m) => m.id !== meldId))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveQueue(draftMelds, draftHand, draftWorkingArea)
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save queue:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    await onClearQueue()
    onOpenChange(false)
  }

  const hasQueued = !!currentPlayer.queuedTurn
  const queuedTime = hasQueued
    ? new Date(currentPlayer.queuedTurn!.queuedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Queue Your Move
            {hasQueued && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Queued
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Plan your turn ahead of time. It will be auto-played when it becomes your turn (if still valid).
            {hasQueued && queuedTime && (
              <span className="block mt-1 text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last queued: {queuedTime}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Board Reference */}
          <div className="border rounded-lg p-3 bg-muted/50">
            <h3 className="text-sm font-semibold mb-2">Current Board (Read-Only)</h3>
            <div className="flex flex-wrap gap-2">
              {gameState.melds.length === 0 ? (
                <p className="text-xs text-muted-foreground">No melds on table</p>
              ) : (
                gameState.melds.slice(0, 3).map((meld) => <MeldDisplay key={meld.id} meld={meld} compact hidePoints />)
              )}
              {gameState.melds.length > 3 && (
                <p className="text-xs text-muted-foreground self-center">... and {gameState.melds.length - 3} more</p>
              )}
            </div>
          </div>

          {/* Planning Board */}
          <div className="border-2 border-primary/20 rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-2">Planned Melds</h3>
            <div className="flex flex-wrap gap-2 min-h-[60px]">
              {draftMelds.length === 0 ? (
                <p className="text-xs text-muted-foreground">No planned melds yet</p>
              ) : (
                draftMelds.map((meld) => (
                  <MeldDisplay key={meld.id} meld={meld} compact onDeleteMeld={handleDeleteMeld} />
                ))
              )}
            </div>
          </div>

          {/* Working Area */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Working Area</h3>
            <div className="flex flex-wrap gap-1 min-h-[50px] mb-2">
              {draftWorkingArea.length === 0 ? (
                <p className="text-xs text-muted-foreground">Select tiles from hand to plan</p>
              ) : (
                draftWorkingArea.map((tile) => <GameTile key={tile.id} tile={tile} size="small" />)
              )}
            </div>
            <Button size="sm" onClick={handleCreateMeld} disabled={draftWorkingArea.length < 3}>
              Create Meld
            </Button>
          </div>

          {/* Your Hand */}
          <div className="border rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-2">Your Hand ({draftHand.length} tiles)</h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {draftHand.map((tile) => (
                <div
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  className={selectedHandTiles.has(tile.id) ? "ring-2 ring-primary rounded" : ""}
                >
                  <GameTile tile={tile} size="small" />
                </div>
              ))}
            </div>
            <Button size="sm" onClick={handleAddToWorkingArea} disabled={selectedHandTiles.size === 0}>
              Add Selected to Working Area
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {hasQueued && (
                <Button variant="destructive" onClick={handleClear}>
                  Clear Queue
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : hasQueued ? "Update Queue" : "Save Queue"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
