"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { Tile } from "@/lib/game-types"
import { GameTile } from "./game-tile"

interface DrawnTileModalProps {
  tile: Tile | null
  onClose: () => void
}

export function DrawnTileModal({ tile, onClose }: DrawnTileModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (tile) {
      // Small delay for animation
      const showTimer = setTimeout(() => setIsVisible(true), 50)

      // Auto-close after 2 seconds
      const closeTimer = setTimeout(() => {
        setIsLeaving(true)
        setTimeout(onClose, 300)
      }, 2000)

      return () => {
        clearTimeout(showTimer)
        clearTimeout(closeTimer)
      }
    } else {
      setIsVisible(false)
      setIsLeaving(false)
    }
  }, [tile, onClose])

  if (!tile) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300",
        isVisible && !isLeaving ? "opacity-100" : "opacity-0",
      )}
      onClick={() => {
        setIsLeaving(true)
        setTimeout(onClose, 300)
      }}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-4 transition-all duration-300",
          isVisible && !isLeaving ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
      >
        <p className="text-lg font-semibold text-white">You drew:</p>
        <div className="transform scale-[2.5] my-8">
          <GameTile tile={tile} size="lg" />
        </div>
        <p className="text-sm text-white/70">Tap anywhere to continue</p>
      </div>
    </div>
  )
}
