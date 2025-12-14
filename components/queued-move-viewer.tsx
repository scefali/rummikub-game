"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GameTile } from "@/components/game-tile"
import { useIsMobile } from "@/hooks/use-mobile"
import { Clock, Trash2 } from "lucide-react"
import type { QueuedTurn } from "@/lib/game-types"

interface QueuedMoveViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queuedTurn: QueuedTurn
  onClearQueue: () => void
}

export function QueuedMoveViewer({ open, onOpenChange, queuedTurn, onClearQueue }: QueuedMoveViewerProps) {
  const isMobile = useIsMobile()

  const queuedAt = new Date(queuedTurn.queuedAt)
  const queuedAgo = Math.floor((Date.now() - queuedTurn.queuedAt) / 1000 / 60)

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Queued {queuedAgo < 1 ? "just now" : `${queuedAgo} min${queuedAgo === 1 ? "" : "s"} ago`}</span>
        <span className="text-xs opacity-50">({queuedAt.toLocaleTimeString()})</span>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold mb-2">Melds to Play ({queuedTurn.plannedMelds.length})</h3>
          <div className="space-y-2">
            {queuedTurn.plannedMelds.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No melds planned</p>
            ) : (
              queuedTurn.plannedMelds.map((meld) => (
                <div key={meld.id} className="flex gap-0.5 p-2 bg-muted/50 rounded-md flex-wrap">
                  {meld.tiles.map((tile) => (
                    <GameTile key={tile.id} tile={tile} size="small" />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Remaining Hand ({queuedTurn.plannedHand.length} tiles)</h3>
          <div className="flex gap-0.5 flex-wrap p-2 bg-muted/50 rounded-md">
            {queuedTurn.plannedHand.map((tile) => (
              <GameTile key={tile.id} tile={tile} size="small" />
            ))}
          </div>
        </div>

        {queuedTurn.plannedWorkingArea.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Working Area ({queuedTurn.plannedWorkingArea.length} tiles)</h3>
            <div className="flex gap-0.5 flex-wrap p-2 bg-muted/50 rounded-md">
              {queuedTurn.plannedWorkingArea.map((tile) => (
                <GameTile key={tile.id} tile={tile} size="small" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            onClearQueue()
            onOpenChange(false)
          }}
          className="flex-1"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete Queue
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1">
          Close
        </Button>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
        <strong>Note:</strong> This move will auto-play when it becomes your turn. If the board changes, you'll be
        notified by email.
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Queued Move
              <Badge variant="secondary" className="ml-auto">
                Pending
              </Badge>
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Queued Move
            <Badge variant="secondary" className="ml-auto">
              Pending
            </Badge>
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
