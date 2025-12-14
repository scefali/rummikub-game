import { Html, Head, Body, Container, Section, Text, Link, Hr } from "@react-email/components"
import type { RoomStyleId, Meld } from "../game-types"
import { summarizeMeld } from "../game-logic"

const EMAIL_STYLES: Record<
  RoomStyleId,
  { background: string; accent: string; textColor: string; containerBg: string }
> = {
  classic: { background: "#1e293b", accent: "#10b981", textColor: "#f1f5f9", containerBg: "#334155" },
  ocean: { background: "#164e63", accent: "#22d3ee", textColor: "#f0f9ff", containerBg: "#155e75" },
  forest: { background: "#14532d", accent: "#34d399", textColor: "#f0fdf4", containerBg: "#166534" },
  sunset: { background: "#7c2d12", accent: "#fb923c", textColor: "#fff7ed", containerBg: "#9a3412" },
  neon: { background: "#581c87", accent: "#e879f9", textColor: "#faf5ff", containerBg: "#6b21a8" },
}

interface QueuedTurnAutoplayedEmailProps {
  playerName: string
  roomCode: string
  gameUrl: string
  melds: Meld[]
  roomStyleId?: RoomStyleId
}

export function QueuedTurnAutoplayedEmail({
  playerName,
  roomCode,
  gameUrl,
  melds,
  roomStyleId = "classic",
}: QueuedTurnAutoplayedEmailProps) {
  const style = EMAIL_STYLES[roomStyleId]
  const firstName = playerName.split(" ")[0]

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: style.background, fontFamily: "sans-serif", padding: "20px" }}>
        <Container
          style={{
            backgroundColor: style.containerBg,
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <Text style={{ fontSize: "24px", fontWeight: "bold", color: style.accent, marginBottom: "16px" }}>
            Queued Turn Auto-Played! 🎉
          </Text>

          <Text style={{ fontSize: "16px", color: style.textColor, marginBottom: "16px" }}>Hey {firstName},</Text>

          <Text style={{ fontSize: "16px", color: style.textColor, marginBottom: "16px", lineHeight: "1.5" }}>
            Great news! Your queued turn in room <strong style={{ color: style.accent }}>{roomCode}</strong> was
            automatically played when it became your turn.
          </Text>

          <Section
            style={{
              backgroundColor: style.background,
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <Text style={{ fontSize: "14px", fontWeight: "bold", color: style.accent, marginBottom: "8px" }}>
              What Was Played:
            </Text>
            <Text style={{ fontSize: "14px", color: style.textColor, marginBottom: "8px" }}>
              Total melds on board: <strong>{melds.length}</strong>
            </Text>
            {melds.slice(0, 5).map((meld, i) => (
              <Text key={i} style={{ fontSize: "13px", color: style.textColor, margin: "4px 0" }}>
                • {summarizeMeld(meld)}
              </Text>
            ))}
            {melds.length > 5 && (
              <Text style={{ fontSize: "13px", color: style.textColor, margin: "4px 0", fontStyle: "italic" }}>
                ... and {melds.length - 5} more
              </Text>
            )}
          </Section>

          <Text style={{ fontSize: "16px", color: style.textColor, marginBottom: "24px", lineHeight: "1.5" }}>
            Your turn was automatically ended. The game continues with the next player.
          </Text>

          <Link
            href={gameUrl}
            style={{
              display: "inline-block",
              backgroundColor: style.accent,
              color: "#000000",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            View Game
          </Link>

          <Hr style={{ borderColor: style.textColor + "40", margin: "24px 0" }} />

          <Text style={{ fontSize: "12px", color: style.textColor + "80", marginTop: "16px" }}>
            Room Code: {roomCode}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
