import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = "Rummikub Game <games@filipinameet.com>"

export async function sendTurnNotificationEmail(
  toEmail: string,
  playerName: string,
  roomCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://rummikub-game.vercel.app"}/game/${roomCode}`

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "🎲 Rummikub - It's Your Turn!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1a1a2e; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #16213e; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f9b8e 0%, #0d7377 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-flex; gap: 4px; margin-bottom: 16px;">
                <span style="display: inline-block; width: 32px; height: 40px; background-color: #e53e3e; border-radius: 6px; color: white; font-weight: bold; font-size: 18px; line-height: 40px;">7</span>
                <span style="display: inline-block; width: 32px; height: 40px; background-color: #3182ce; border-radius: 6px; color: white; font-weight: bold; font-size: 18px; line-height: 40px;">8</span>
                <span style="display: inline-block; width: 32px; height: 40px; background-color: #d69e2e; border-radius: 6px; color: #1a1a2e; font-weight: bold; font-size: 18px; line-height: 40px;">9</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">It's Your Turn!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px 24px;">
              <p style="color: #e2e8f0; font-size: 18px; margin: 0 0 8px 0;">Hey ${playerName}! 👋</p>
              <p style="color: #a0aec0; font-size: 16px; margin: 0 0 24px 0;">
                Your friends are waiting for you in room <strong style="color: #0f9b8e; font-family: monospace; font-size: 18px;">${roomCode}</strong>
              </p>
              
              <!-- CTA Button -->
              <a href="${gameUrl}" style="display: block; background: linear-gradient(135deg, #0f9b8e 0%, #0d7377 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 18px; font-weight: bold; text-align: center; margin: 24px 0;">
                Play Now →
              </a>
              
              <p style="color: #718096; font-size: 14px; margin: 24px 0 0 0; text-align: center;">
                Or open the app directly on your device
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #0f1629; padding: 16px 24px; text-align: center;">
              <p style="color: #4a5568; font-size: 12px; margin: 0;">
                You received this email because you're playing Rummikub Online.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hey ${playerName}! It's your turn in Rummikub! Your friends are waiting in room ${roomCode}. Play now: ${gameUrl}`,
    })

    if (error) {
      console.error("[v0] Resend error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Turn notification email sent to:", toEmail)
    return { success: true }
  } catch (err) {
    console.error("[v0] Email send error:", err)
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" }
  }
}
