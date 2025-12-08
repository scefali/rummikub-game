import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTurnNotificationEmail(email: string, playerName: string, roomCode: string): Promise<boolean> {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://rummikub-game.vercel.app"}/game/${roomCode}`

  try {
    const { error } = await resend.emails.send({
      from: "Rummikub Game <games@filipinameet.com>",
      to: email,
      subject: "It's your turn in Rummikub!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
              <h1 style="color: #2dd4bf; margin: 0 0 16px 0; font-size: 28px; text-align: center;">
                🎮 It's Your Turn!
              </h1>
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Hey <strong style="color: #f8fafc;">${playerName}</strong>, your opponent has made their move in Rummikub. Time to play your tiles!
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${gameUrl}" style="display: inline-block; background-color: #2dd4bf; color: #0f172a; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                  Play Now
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                Room Code: <strong style="color: #94a3b8;">${roomCode}</strong>
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error("[v0] Resend error:", error)
      return false
    }

    console.log("[v0] Email sent successfully to:", email)
    return true
  } catch (err) {
    console.error("[v0] Email send exception:", err)
    return false
  }
}
