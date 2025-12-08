import { getPlayerCookie, setPlayerCookie } from "@/lib/cookies"
import { redirect } from "next/navigation"
import { GameClient } from "./game-client"
import * as gameStore from "@/lib/game-store"

interface GamePageProps {
  params: Promise<{ code: string }>
  searchParams: Promise<{ p?: string }>
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { code } = await params
  const { p: playerCode } = await searchParams
  const roomCode = code.toUpperCase()

  // Read player cookie on server
  const playerCookie = await getPlayerCookie()

  if (playerCode && (!playerCookie || playerCookie.roomCode !== roomCode)) {
    console.log("[v0] Attempting login with player code:", playerCode, "for room:", roomCode)
    const loginResult = await gameStore.loginWithCode(roomCode, playerCode)
    console.log("[v0] Login result:", loginResult)

    if (loginResult.success && loginResult.playerId && loginResult.playerName) {
      await setPlayerCookie(loginResult.playerId, loginResult.playerName, roomCode)
      return <GameClient roomCode={roomCode} playerId={loginResult.playerId} playerName={loginResult.playerName} />
    }
  }

  // If no cookie or different room, redirect to home with join param
  if (!playerCookie || playerCookie.roomCode !== roomCode) {
    redirect(`/?join=${roomCode}`)
  }

  return <GameClient roomCode={roomCode} playerId={playerCookie.odId} playerName={playerCookie.name} />
}
