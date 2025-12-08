"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCheck, UserX } from "lucide-react"

interface PlayerConfirmModalProps {
  playerName: string
  onConfirm: () => void
  onDeny: () => void
  isLoading?: boolean
}

export function PlayerConfirmModal({ playerName, onConfirm, onDeny, isLoading }: PlayerConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Confirm Your Identity</CardTitle>
          <CardDescription>This link is for a specific player. Please confirm if this is you.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-primary/10 rounded-lg p-6 mb-4">
            <p className="text-muted-foreground text-sm mb-2">Are you</p>
            <p className="text-2xl font-bold text-primary">{playerName}?</p>
          </div>
          <p className="text-sm text-muted-foreground">
            If this is not you, you&apos;ll be redirected to join or start a new game.
          </p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onDeny} disabled={isLoading}>
            <UserX className="w-4 h-4 mr-2" />
            No, that&apos;s not me
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={isLoading}>
            <UserCheck className="w-4 h-4 mr-2" />
            Yes, that&apos;s me
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
