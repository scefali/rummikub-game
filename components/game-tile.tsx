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
  showAssigned?: boolean
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

function JokerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-full h-full", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wild green hair */}
      <path
        d="M4 8C4 8 5 3 8 2C9 4 7 6 7 6C7 6 9 2 12 2C15 2 17 6 17 6C17 6 15 4 16 2C19 3 20 8 20 8"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="0.5"
      />
      <path d="M3 9C3 9 4 5 7 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21 9C21 9 20 5 17 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />

      {/* White face */}
      <ellipse cx="12" cy="13" rx="7" ry="8" fill="#f5f5f5" stroke="#a1a1aa" strokeWidth="0.5" />

      {/* Menacing eyes */}
      <ellipse cx="9" cy="11" rx="1.5" ry="1" fill="#18181b" />
      <ellipse cx="15" cy="11" rx="1.5" ry="1" fill="#18181b" />
      <circle cx="9.5" cy="10.8" r="0.4" fill="#fef08a" />
      <circle cx="15.5" cy="10.8" r="0.4" fill="#fef08a" />

      {/* Raised eyebrows */}
      <path d="M7 9C7.5 8 8.5 8 10 8.5" stroke="#22c55e" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M17 9C16.5 8 15.5 8 14 8.5" stroke="#22c55e" strokeWidth="0.8" strokeLinecap="round" />

      {/* Sinister smile */}
      <path
        d="M7 15C7 15 8 19 12 19C16 19 17 15 17 15"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
        fill="#dc2626"
      />
      {/* Extended smile scars */}
      <path d="M6 14.5C5 14 4.5 13 5 12" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M18 14.5C19 14 19.5 13 19 12" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />

      {/* Teeth */}
      <path d="M9 16.5V18" stroke="#f5f5f5" strokeWidth="0.8" />
      <path d="M11 17V18.5" stroke="#f5f5f5" strokeWidth="0.8" />
      <path d="M13 17V18.5" stroke="#f5f5f5" strokeWidth="0.8" />
      <path d="M15 16.5V18" stroke="#f5f5f5" strokeWidth="0.8" />
    </svg>
  )
}

export function GameTile({
  tile,
  size = "md",
  selected = false,
  onClick,
  draggable = false,
  className,
  showAssigned = false,
}: GameTileProps) {
  const displayAssigned = showAssigned && tile.isJoker && tile.assignedNumber
  const displayColor = displayAssigned ? tile.assignedColor || tile.color : tile.color

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      disabled={!onClick}
      className={cn(
        "relative flex items-center justify-center rounded-lg font-bold transition-all",
        "bg-tile-bg shadow-md border-2 border-border/30",
        "active:scale-95",
        onClick ? "cursor-pointer hover:scale-105 hover:shadow-lg hover:border-primary/50" : "cursor-default",
        sizeClasses[size],
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
        className,
      )}
    >
      {tile.isJoker ? (
        <div className="relative flex items-center justify-center w-full h-full">
          <div className="w-3/4 h-3/4">
            <JokerIcon />
          </div>
          {displayAssigned && (
            <span className={cn("absolute top-0 left-0.5 font-black text-xs", colorClasses[displayColor])}>
              {tile.assignedNumber}
            </span>
          )}
        </div>
      ) : (
        <span className={cn(colorClasses[tile.color], "font-black")}>{tile.number}</span>
      )}
    </button>
  )
}
