import { getPlayerCookie } from "@/lib/cookies"
import { redirect } from "next/navigation"
import { GameClient } from "./game-client"

interface GamePageProps {
  params: Promise<{ code: string }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { code } = await params
  const roomCode = code.toUpperCase()

  // Read player cookie on server
  const playerCookie = await getPlayerCookie()

  // If no cookie or different room, redirect to home with join param
  if (!playerCookie || playerCookie.roomCode !== roomCode) {
    redirect(`/?join=${roomCode}`)
  }

  return <GameClient roomCode={roomCode} playerId={playerCookie.odId} playerName={playerCookie.name} />
}
