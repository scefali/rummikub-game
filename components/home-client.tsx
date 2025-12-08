"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Sparkles, Mail, KeyRound, Shuffle } from "lucide-react"
import { setPlayerCookie } from "@/lib/cookies"
import { generateRandomName } from "@/lib/name-generator"

interface HomeClientProps {
  joinCode?: string
}

export function HomeClient({ joinCode }: HomeClientProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [playerEmail, setPlayerEmail] = useState("")
  const [roomCode, setRoomCode] = useState(joinCode || "")
  const [playerCode, setPlayerCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getNameOrGenerate = () => {
    if (playerName.trim()) return playerName.trim()
    const generated = generateRandomName()
    setPlayerName(generated)
    return generated
  }

  const handleCreate = async () => {
    setIsLoading(true)
    setError(null)

    const name = getNameOrGenerate()

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_room",
          playerName: name,
          playerEmail: playerEmail.trim() || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room")
      }

      await setPlayerCookie(data.playerId, name, data.roomCode)
      router.push(`/game/${data.roomCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room")
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!roomCode.trim()) return
    setIsLoading(true)
    setError(null)

    const code = roomCode.trim().toUpperCase()
    const name = getNameOrGenerate()

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join_room",
          roomCode: code,
          playerName: name,
          playerEmail: playerEmail.trim() || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to join room")
      }

      await setPlayerCookie(data.playerId, name, code)
      router.push(`/game/${code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room")
      setIsLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!roomCode.trim() || !playerCode.trim()) return
    setIsLoading(true)
    setError(null)

    const code = roomCode.trim().toUpperCase()
    const pCode = playerCode.trim().toUpperCase()

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login_with_code",
          roomCode: code,
          playerCode: pCode,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to login")
      }

      // Set cookie with player info from login
      await setPlayerCookie(data.playerId, data.playerName, code)

      router.push(`/game/${code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login")
      setIsLoading(false)
    }
  }

  const handleGenerateName = () => {
    setPlayerName(generateRandomName())
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
          <CardDescription>Create a new room, join one, or login to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs for Create/Join/Login */}
          <Tabs defaultValue={joinCode ? "join" : "create"} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="create" className="gap-1 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Create</span>
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-1 text-xs sm:text-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Join</span>
              </TabsTrigger>
              <TabsTrigger value="login" className="gap-1 text-xs sm:text-sm">
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              {/* Name Input */}
              <div>
                <label htmlFor="playerNameCreate" className="block text-sm font-medium text-muted-foreground mb-2">
                  Your Name <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    id="playerNameCreate"
                    placeholder="Leave blank for random name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="bg-input/50 flex-1"
                    autoComplete="name"
                    name="name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateName}
                    title="Generate random name"
                    className="shrink-0 cursor-pointer bg-transparent"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label htmlFor="playerEmailCreate" className="block text-sm font-medium text-muted-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-muted-foreground/60">(optional)</span>
                  </span>
                </label>
                <Input
                  id="playerEmailCreate"
                  type="email"
                  placeholder="Get notified when it's your turn"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  className="bg-input/50"
                  autoComplete="email"
                  name="email"
                />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Create a new room and share the code with friends
              </p>
              <Button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold cursor-pointer"
              >
                {isLoading ? "Creating..." : "Create Room"}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              {/* Name Input */}
              <div>
                <label htmlFor="playerNameJoin" className="block text-sm font-medium text-muted-foreground mb-2">
                  Your Name <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    id="playerNameJoin"
                    placeholder="Leave blank for random name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="bg-input/50 flex-1"
                    autoComplete="name"
                    name="name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateName}
                    title="Generate random name"
                    className="shrink-0 cursor-pointer bg-transparent"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label htmlFor="playerEmailJoin" className="block text-sm font-medium text-muted-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-muted-foreground/60">(optional)</span>
                  </span>
                </label>
                <Input
                  id="playerEmailJoin"
                  type="email"
                  placeholder="Get notified when it's your turn"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  className="bg-input/50"
                  autoComplete="email"
                  name="email"
                />
              </div>

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
                disabled={!roomCode.trim() || isLoading}
                className="w-full h-12 text-lg font-semibold cursor-pointer"
              >
                {isLoading ? "Joining..." : "Join Room"}
              </Button>
            </TabsContent>

            <TabsContent value="login" className="space-y-4">
              {/* Continue playing on a different device using your player code */}
              <p className="text-sm text-muted-foreground text-center">
                Continue playing on a different device using your player code
              </p>

              <div>
                <label htmlFor="roomCodeLogin" className="block text-sm font-medium text-muted-foreground mb-2">
                  Room Code
                </label>
                <Input
                  id="roomCodeLogin"
                  placeholder="ABCD"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-input/50 text-center text-2xl font-mono tracking-widest uppercase"
                />
              </div>

              <div>
                <label htmlFor="playerCode" className="block text-sm font-medium text-muted-foreground mb-2">
                  Your Player Code
                </label>
                <Input
                  id="playerCode"
                  placeholder="ABC123"
                  value={playerCode}
                  onChange={(e) => setPlayerCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-input/50 text-center text-2xl font-mono tracking-widest uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find your player code in the game header after joining
                </p>
              </div>

              <Button
                onClick={handleLogin}
                disabled={!roomCode.trim() || !playerCode.trim() || isLoading}
                className="w-full h-12 text-lg font-semibold cursor-pointer"
              >
                {isLoading ? "Logging in..." : "Continue Game"}
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
      <p className="mt-8 text-sm text-muted-foreground">2-6 players • Works on all devices</p>
    </div>
  )
}
