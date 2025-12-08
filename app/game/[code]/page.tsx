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
    const loginResult = await gameStore.loginWithCode(roomCode, playerCode)
    if (loginResult.success && loginResult.playerId && loginResult.playerName) {
      // Set the cookie for this device
      await setPlayerCookie({
        odId: loginResult.playerId,
        name: loginResult.playerName,
        roomCode: roomCode,
      })
      // Use the logged in player info
      return <GameClient roomCode={roomCode} playerId={loginResult.playerId} playerName={loginResult.playerName} />
    }
  }

  // If no cookie or different room, redirect to home with join param
  if (!playerCookie || playerCookie.roomCode !== roomCode) {
    redirect(`/?join=${roomCode}`)
  }

  return <GameClient roomCode={roomCode} playerId={playerCookie.odId} playerName={playerCookie.name} />
}
