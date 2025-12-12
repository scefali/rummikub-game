import { Body, Container, Head, Heading, Html, Preview, Section, Text, Link, Hr } from "@react-email/components"
import type { RoomStyleId } from "../game-types"

interface GameResultsEmailProps {
  playerName: string
  roomCode: string
  gameUrl: string
  winner: string
  playerScores: { name: string; points: number }[]
  roomStyleId?: RoomStyleId
}

// Email-compatible style colors (CSS gradients don't work in emails)
const EMAIL_STYLES = {
  classic: { bg: "#0d4a3d", accent: "#10b981" },
  ocean: { bg: "#1e3a5f", accent: "#3b82f6" },
  forest: { bg: "#1f4d2e", accent: "#22c55e" },
  sunset: { bg: "#5c2a1f", accent: "#f97316" },
  neon: { bg: "#4a1d5c", accent: "#a855f7" },
}

export function GameResultsEmail({
  playerName,
  roomCode,
  gameUrl,
  winner,
  playerScores,
  roomStyleId = "classic",
}: GameResultsEmailProps) {
  const style = EMAIL_STYLES[roomStyleId] || EMAIL_STYLES.classic
  const firstName = playerName.split(" ")[0]
  const winnerFirstName = winner.split(" ")[0]

  return (
    <Html>
      <Head />
      <Preview>Game Over! {winnerFirstName} wins</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Section
            style={{
              backgroundColor: style.bg,
              borderRadius: "12px",
              padding: "32px 24px",
              color: "#ffffff",
            }}
          >
            <Heading style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px", textAlign: "center" }}>
              🏆 Game Over!
            </Heading>
            <Text style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "24px", textAlign: "center" }}>
              Hey {firstName}, your Rummikub game has ended.
            </Text>

            <Section
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: style.accent,
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Winner
              </Text>
              <Text style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 16px 0" }}>🎉 {winnerFirstName}</Text>

              <Hr style={{ borderColor: "rgba(255, 255, 255, 0.2)", margin: "16px 0" }} />

              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: style.accent,
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Final Scores
              </Text>
              {playerScores.map((player, idx) => (
                <Text
                  key={idx}
                  style={{
                    fontSize: "16px",
                    margin: "8px 0",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{player.name.split(" ")[0]}</span>
                  <span style={{ fontWeight: "bold", color: style.accent }}>{player.points} pts</span>
                </Text>
              ))}
            </Section>

            <Section style={{ textAlign: "center", marginTop: "24px" }}>
              <Link
                href={gameUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: style.accent,
                  color: "#ffffff",
                  padding: "12px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                Play Again
              </Link>
            </Section>

            <Text
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                marginTop: "24px",
              }}
            >
              Room Code: {roomCode}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
