import { getPlayerCookie } from "@/lib/cookies"
import { redirect } from "next/navigation"
import { HomeClient } from "@/components/home-client"

interface HomePageProps {
  searchParams: Promise<{ join?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { join } = await searchParams

  // Check if user has an existing session
  const playerCookie = await getPlayerCookie()

  // If user has a valid cookie and is trying to access home, redirect to their game
  if (playerCookie && !join) {
    redirect(`/game/${playerCookie.roomCode}`)
  }

  return <HomeClient joinCode={join?.toUpperCase()} />
}
