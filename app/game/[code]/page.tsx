import { getPlayerCookie } from "@/lib/cookies"
import { redirect } from "next/navigation"
import { GameClient } from "./game-client"
import { GamePageClient } from "./game-page-client"
import * as gameStore from "@/lib/game-store"

interface GamePageProps {
  params: Promise<{ code: string }>
  searchParams: Promise<{ p?: string }>
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  console.log("[v0] GamePage: rendering")
  const { code } = await params
  const { p: playerCode } = await searchParams
  const roomCode = code.toUpperCase()
  console.log("[v0] GamePage: roomCode =", roomCode, "playerCode =", playerCode)

  // Read player cookie on server
  const playerCookie = await getPlayerCookie(roomCode)
  console.log("[v0] GamePage: playerCookie =", playerCookie ? "exists" : "null")

  if (playerCookie) {
    console.log("[v0] GamePage: Rendering GameClient with cookie auth")
    return <GameClient roomCode={roomCode} playerId={playerCookie.playerId} playerName={playerCookie.name} />
  }

  if (playerCode) {
    console.log("[v0] GamePage: Looking up player by code")
    const playerInfo = await gameStore.getPlayerByCode(roomCode, playerCode)
    console.log("[v0] GamePage: playerInfo =", playerInfo)

    if (playerInfo.success && playerInfo.playerName) {
      console.log("[v0] GamePage: Rendering GamePageClient with pending login")
      // Pass pending login info to client for confirmation
      return (
        <GamePageClient
          roomCode={roomCode}
          pendingLogin={{
            playerCode,
            playerName: playerInfo.playerName,
          }}
        />
      )
    }
  }

  console.log("[v0] GamePage: No auth, redirecting to home")
  // No cookie and no valid player code, redirect to home with join param
  redirect(`/?join=${roomCode}`)
}
