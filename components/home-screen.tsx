"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Sparkles } from "lucide-react"

interface HomeScreenProps {
  onCreateRoom: (playerName: string) => void
  onJoinRoom: (roomCode: string, playerName: string) => void
  error?: string | null
}

export function HomeScreen({ onCreateRoom, onJoinRoom, error }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = () => {
    if (!playerName.trim()) return
    setIsLoading(true)
    onCreateRoom(playerName.trim())
  }

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return
    setIsLoading(true)
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim())
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex gap-1">
            <div className="w-8 h-10 bg-tile-red rounded-md flex items-center justify-center text-foreground font-bold text-sm shadow-lg">
              7
            </div>
            <div className="w-8 h-10 bg-tile-blue rounded-md flex items-center justify-center text-foreground font-bold text-sm shadow-lg">
              8
            </div>
            <div className="w-8 h-10 bg-tile-yellow rounded-md flex items-center justify-center text-background font-bold text-sm shadow-lg">
              9
            </div>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Rummikub</h1>
        <p className="text-muted-foreground text-lg">Play with friends anywhere</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Start Playing</CardTitle>
          <CardDescription>Create a new room or join an existing one</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Name Input */}
          <div className="mb-6">
            <label htmlFor="playerName" className="block text-sm font-medium text-muted-foreground mb-2">
              Your Name
            </label>
            <Input
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className="bg-input/50"
            />
          </div>

          {/* Tabs for Create/Join */}
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="create" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-2">
                <Users className="w-4 h-4" />
                Join
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Create a new room and share the code with friends
              </p>
              <Button
                onClick={handleCreate}
                disabled={!playerName.trim() || isLoading}
                className="w-full h-12 text-lg font-semibold"
              >
                {isLoading ? "Creating..." : "Create Room"}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-muted-foreground mb-2">
                  Room Code
                </label>
                <Input
                  id="roomCode"
                  placeholder="ABCD"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-input/50 text-center text-2xl font-mono tracking-widest uppercase"
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={!playerName.trim() || !roomCode.trim() || isLoading}
                className="w-full h-12 text-lg font-semibold"
              >
                {isLoading ? "Joining..." : "Join Room"}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-sm text-muted-foreground">2-4 players • Works on all devices</p>
    </div>
  )
}
