"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, KeyRound } from "lucide-react"

interface PlayerCodeDisplayProps {
  playerCode: string
}

export function PlayerCodeDisplay({ playerCode }: PlayerCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(playerCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = playerCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1 text-xs font-mono cursor-pointer bg-transparent"
      title="Your player code - use this to login from another device"
    >
      <KeyRound className="w-3 h-3" />
      {playerCode}
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  )
}
