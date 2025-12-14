import { Resend } from "resend"
import { TurnNotificationEmail } from "./emails/turn-notification"
import { GameLinkEmail } from "./emails/game-link"
import { QueuedTurnAutoplayedEmail } from "./emails/queued-turn-autoplayed"
import { QueuedTurnFailedEmail } from "./emails/queued-turn-failed"
import type { RoomStyleId, Meld } from "./game-types"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTurnNotificationEmail(
  to: string,
  playerName: string,
  roomCode: string,
  playerCode: string,
  playerStandings?: { name: string; tileCount: number }[],
  roomStyleId?: RoomStyleId,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rummikub-game.vercel.app"
  const gameUrl = `${appUrl}/game/${roomCode}?p=${playerCode}`

  console.log("[v0] Sending turn notification email to:", to)
  console.log("[v0] Player:", playerName, "Room:", roomCode)
  console.log("[v0] Game URL:", gameUrl)
  console.log("[v0] Player standings:", playerStandings)
  console.log("[v0] Room style:", roomStyleId)

  try {
    const { data, error } = await resend.emails.send({
      from: "Rummikub Game <games@filipinameet.com>",
      to: [to],
      subject: `It's your turn in Rummikub game ${roomCode}!`,
      react: TurnNotificationEmail({ playerName, roomCode, gameUrl, playerStandings, roomStyleId }),
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      return { success: false, error }
    }

    console.log("[v0] Email sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("[v0] Exception sending email:", error)
    return { success: false, error }
  }
}

export async function sendGameLinkEmail(
  to: string,
  playerName: string,
  roomCode: string,
  playerCode: string,
  roomStyleId?: RoomStyleId,
  allPlayerNames?: string[],
  gameStartedAt?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rummikub-game.vercel.app"
  const gameUrl = `${appUrl}/game/${roomCode}?p=${playerCode}`

  console.log("[v0] Sending game link email to:", to)
  console.log("[v0] Player:", playerName, "Room:", roomCode)
  console.log("[v0] Game URL:", gameUrl)

  try {
    const { data, error } = await resend.emails.send({
      from: "Rummikub Game <games@filipinameet.com>",
      to: [to],
      subject: `Rummikub game started: ${allPlayerNames?.join(", ") || roomCode}`,
      react: GameLinkEmail({
        playerName,
        roomCode,
        gameUrl,
        roomStyleId,
        allPlayerNames: allPlayerNames || [playerName],
        gameStartedAt: gameStartedAt || new Date().toLocaleString(),
      }),
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      return { success: false, error }
    }

    console.log("[v0] Email sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("[v0] Exception sending email:", error)
    return { success: false, error }
  }
}

export async function sendQueuedTurnAutoplayedEmail(
  to: string,
  playerName: string,
  roomCode: string,
  playerCode: string,
  melds: Meld[],
  roomStyleId?: RoomStyleId,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rummikub-game.vercel.app"
  const gameUrl = `${appUrl}/game/${roomCode}?p=${playerCode}`

  console.log("[v0] Sending queued turn autoplayed email to:", to)
  console.log("[v0] Player:", playerName, "Room:", roomCode)

  try {
    const { data, error } = await resend.emails.send({
      from: "Rummikub Game <games@filipinameet.com>",
      to: [to],
      subject: `Your queued turn was auto-played in ${roomCode}!`,
      react: QueuedTurnAutoplayedEmail({ playerName, roomCode, gameUrl, melds, roomStyleId }),
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      return { success: false, error }
    }

    console.log("[v0] Email sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("[v0] Exception sending email:", error)
    return { success: false, error }
  }
}

export async function sendQueuedTurnFailedEmail(
  to: string,
  playerName: string,
  roomCode: string,
  playerCode: string,
  reason: string,
  boardChanges: { added: string[]; removed: string[] },
  queuedAt: number,
  baseRevision: number,
  roomStyleId?: RoomStyleId,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rummikub-game.vercel.app"
  const gameUrl = `${appUrl}/game/${roomCode}?p=${playerCode}`

  console.log("[v0] Sending queued turn failed email to:", to)
  console.log("[v0] Player:", playerName, "Room:", roomCode)

  try {
    const { data, error } = await resend.emails.send({
      from: "Rummikub Game <games@filipinameet.com>",
      to: [to],
      subject: `Queued turn failed in ${roomCode} - It's your turn!`,
      react: QueuedTurnFailedEmail({
        playerName,
        roomCode,
        gameUrl,
        reason,
        boardChanges,
        queuedAt,
        baseRevision,
        roomStyleId,
      }),
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      return { success: false, error }
    }

    console.log("[v0] Email sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("[v0] Exception sending email:", error)
    return { success: false, error }
  }
}
