"use server"

import { cookies } from "next/headers"

const COOKIE_NAME = "rummikub_player"
const COOKIE_MAX_AGE = 60 * 60 * 2 // 2 hours

interface PlayerCookie {
  odId: string
  name: string
  roomCode: string
}

export async function setPlayerCookie(playerId: string, playerName: string, roomCode: string) {
  const cookieStore = await cookies()
  const value: PlayerCookie = {
    odId: playerId,
    name: playerName,
    roomCode: roomCode.toUpperCase(),
  }

  cookieStore.set(COOKIE_NAME, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
}

export async function getPlayerCookie(): Promise<PlayerCookie | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) return null

  try {
    return JSON.parse(cookie.value) as PlayerCookie
  } catch {
    return null
  }
}

export async function clearPlayerCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
