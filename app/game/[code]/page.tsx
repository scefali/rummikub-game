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
  const { code } = await params
  const { p: playerCode } = await searchParams
  const roomCode = code.toUpperCase()

  // Read player cookie on server
  const playerCookie = await getPlayerCookie()

  if (playerCookie && playerCookie.roomCode === roomCode) {
    return <GameClient roomCode={roomCode} playerId={playerCookie.odId} playerName={playerCookie.name} />
  }

  if (playerCode) {
    const playerInfo = await gameStore.getPlayerByCode(roomCode, playerCode)

    if (playerInfo.success && playerInfo.playerName) {
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

  // No cookie and no valid player code, redirect to home with join param
  redirect(`/?join=${roomCode}`)
}
