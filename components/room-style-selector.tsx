"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Palette, Check } from "lucide-react"
import { ROOM_STYLES, type RoomStyleId } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface RoomStyleSelectorProps {
  currentStyleId: RoomStyleId
  onStyleChange: (styleId: RoomStyleId) => void
  disabled?: boolean
}

export function RoomStyleSelector({ currentStyleId, onStyleChange, disabled }: RoomStyleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentStyle = ROOM_STYLES[currentStyleId]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled={disabled}>
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">{currentStyle.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.values(ROOM_STYLES).map((style) => (
          <DropdownMenuItem
            key={style.id}
            onClick={() => {
              onStyleChange(style.id)
              setIsOpen(false)
            }}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              style.id === currentStyleId && "bg-primary/10",
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded-full", style.background)} />
              <span>{style.name}</span>
            </div>
            {style.id === currentStyleId && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
