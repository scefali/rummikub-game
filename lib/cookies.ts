"use server"

import { cookies } from "next/headers"

const COOKIE_PREFIX = "rummikub_player_"
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

interface PlayerCookie {
  odId: string
  name: string
  roomCode: string
}

export async function setPlayerCookie(playerId: string, playerName: string, roomCode: string) {
  const cookieStore = await cookies()
  const upperRoomCode = roomCode.toUpperCase()
  const cookieName = `${COOKIE_PREFIX}${upperRoomCode}`

  const value: PlayerCookie = {
    odId: playerId,
    name: playerName,
    roomCode: upperRoomCode,
  }

  cookieStore.set(cookieName, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
}

export async function getPlayerCookie(roomCode: string): Promise<PlayerCookie | null> {
  const cookieStore = await cookies()
  const upperRoomCode = roomCode.toUpperCase()
  const cookieName = `${COOKIE_PREFIX}${upperRoomCode}`
  const cookie = cookieStore.get(cookieName)

  if (!cookie?.value) return null

  try {
    return JSON.parse(cookie.value) as PlayerCookie
  } catch {
    return null
  }
}

export async function clearPlayerCookie(roomCode: string) {
  const cookieStore = await cookies()
  const upperRoomCode = roomCode.toUpperCase()
  const cookieName = `${COOKIE_PREFIX}${upperRoomCode}`
  cookieStore.delete(cookieName)
}
