"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, AlertTriangle } from "lucide-react"

interface EndGameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function EndGameModal({ isOpen, onClose, onConfirm }: EndGameModalProps) {
  const [isEnding, setIsEnding] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsEnding(true)
    await onConfirm()
    setIsEnding(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-bold">End Game?</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          This will end the game for all players and return everyone to the lobby. Are you sure you want to continue?
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose} disabled={isEnding}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleConfirm} disabled={isEnding}>
            {isEnding ? "Ending..." : "End Game"}
          </Button>
        </div>
      </div>
    </div>
  )
}
