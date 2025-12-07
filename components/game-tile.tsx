"use client"

import { cn } from "@/lib/utils"
import type { Tile } from "@/lib/game-types"

interface GameTileProps {
  tile: Tile
  size?: "sm" | "md" | "lg"
  selected?: boolean
  onClick?: () => void
  draggable?: boolean
  className?: string
}

const sizeClasses = {
  sm: "w-8 h-10 text-sm",
  md: "w-10 h-14 text-base",
  lg: "w-12 h-16 text-lg",
}

const colorClasses = {
  red: "text-tile-red",
  blue: "text-tile-blue",
  yellow: "text-tile-yellow",
  black: "text-tile-black",
}

export function GameTile({
  tile,
  size = "md",
  selected = false,
  onClick,
  draggable = false,
  className,
}: GameTileProps) {
  return (
    <div
      onClick={onClick}
      draggable={draggable}
      className={cn(
        "flex items-center justify-center rounded-lg font-bold cursor-pointer transition-all",
        "bg-tile-bg shadow-md border-2 border-border/30",
        "hover:scale-105 active:scale-95",
        sizeClasses[size],
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
        !onClick && "cursor-default hover:scale-100 active:scale-100",
        className,
      )}
    >
      {tile.isJoker ? (
        <span className="text-transparent bg-gradient-to-br from-tile-red via-tile-blue to-tile-yellow bg-clip-text font-black">
          ★
        </span>
      ) : (
        <span className={cn(colorClasses[tile.color], "font-black")}>{tile.number}</span>
      )}
    </div>
  )
}
