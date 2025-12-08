import { Resend } from "resend"
import { TurnNotificationEmail } from "./emails/turn-notification"
import type { RoomStyleId } from "./game-types"

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
