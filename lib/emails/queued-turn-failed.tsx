import { Html, Head, Body, Container, Section, Text, Link, Hr } from "@react-email/components"
import type { RoomStyleId } from "../game-types"

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

interface QueuedTurnFailedEmailProps {
  playerName: string
  roomCode: string
  gameUrl: string
  reason: string
  boardChanges: { added: string[]; removed: string[] }
  queuedAt: number
  baseRevision: number
  currentRevision?: number
  roomStyleId?: RoomStyleId
}

export function QueuedTurnFailedEmail({
  playerName,
  roomCode,
  gameUrl,
  reason,
  boardChanges,
  queuedAt,
  baseRevision,
  currentRevision,
  roomStyleId = "classic",
}: QueuedTurnFailedEmailProps) {
  const style = EMAIL_STYLES[roomStyleId]
  const firstName = playerName.split(" ")[0]
  const queuedTime = new Date(queuedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

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
          <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444", marginBottom: "16px" }}>
            Queued Turn Failed
          </Text>

          <Text style={{ fontSize: "16px", color: style.textColor, marginBottom: "16px" }}>Hey {firstName},</Text>

          <Text style={{ fontSize: "16px", color: style.textColor, marginBottom: "16px", lineHeight: "1.5" }}>
            Your queued turn in room <strong style={{ color: style.accent }}>{roomCode}</strong> could not be
            auto-played when it became your turn.
          </Text>

          <Section
            style={{
              backgroundColor: style.background,
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#ef4444", marginBottom: "8px" }}>
              Why It Failed:
            </Text>
            <Text style={{ fontSize: "14px", color: style.textColor, marginBottom: "16px" }}>{reason}</Text>

            {(boardChanges.added.length > 0 || boardChanges.removed.length > 0) && (
              <>
                <Text style={{ fontSize: "14px", fontWeight: "bold", color: style.accent, marginBottom: "8px" }}>
                  Board Changes Since Queue:
                </Text>
                {boardChanges.added.length > 0 && (
                  <>
                    <Text style={{ fontSize: "13px", color: style.textColor, marginBottom: "4px" }}>Tiles added:</Text>
                    {boardChanges.added.map((tile, i) => (
                      <Text key={i} style={{ fontSize: "12px", color: style.textColor, margin: "2px 0 2px 16px" }}>
                        • {tile}
                      </Text>
                    ))}
                  </>
                )}
                {boardChanges.removed.length > 0 && (
                  <>
                    <Text style={{ fontSize: "13px", color: style.textColor, marginBottom: "4px", marginTop: "8px" }}>
                      Tiles removed:
                    </Text>
                    {boardChanges.removed.map((tile, i) => (
                      <Text key={i} style={{ fontSize: "12px", color: style.textColor, margin: "2px 0 2px 16px" }}>
                        • {tile}
                      </Text>
                    ))}
                  </>
                )}
              </>
            )}

            <Hr style={{ borderColor: style.textColor + "40", margin: "16px 0" }} />

            <Text style={{ fontSize: "12px", color: style.textColor + "80" }}>
              Queued at: {queuedTime} | Board version: {baseRevision}
              {currentRevision && ` → ${currentRevision}`}
            </Text>

            <Text style={{ fontSize: "12px", color: style.textColor + "80", marginTop: "8px" }}>
              {currentRevision && baseRevision !== currentRevision
                ? `The board changed ${currentRevision - baseRevision} times since you queued this turn.`
                : "The board state did not match your queued move."}
            </Text>
          </Section>

          <Text style={{ fontSize: "16px", color: style.textColor, marginBottom: "24px", lineHeight: "1.5" }}>
            <strong>It's still your turn!</strong> Please open the game and play manually.
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
            Play Your Turn
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
