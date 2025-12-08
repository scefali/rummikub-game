import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from "@react-email/components"
import type { RoomStyleId } from "../game-types"

interface PlayerStanding {
  name: string
  tileCount: number
}

interface TurnNotificationEmailProps {
  playerName: string
  roomCode: string
  gameUrl: string
  playerStandings?: PlayerStanding[]
  roomStyleId?: RoomStyleId
}

const EMAIL_STYLES: Record<RoomStyleId, { background: string; accent: string; secondary: string }> = {
  classic: {
    background: "#0f172a",
    accent: "#2dd4bf",
    secondary: "#1e293b",
  },
  ocean: {
    background: "#082f49",
    accent: "#22d3ee",
    secondary: "#0c4a6e",
  },
  forest: {
    background: "#052e16",
    accent: "#34d399",
    secondary: "#14532d",
  },
  sunset: {
    background: "#431407",
    accent: "#fb923c",
    secondary: "#7c2d12",
  },
  neon: {
    background: "#2e1065",
    accent: "#e879f9",
    secondary: "#581c87",
  },
}

export function TurnNotificationEmail({
  playerName,
  roomCode,
  gameUrl,
  playerStandings,
  roomStyleId = "classic",
}: TurnNotificationEmailProps) {
  const colors = EMAIL_STYLES[roomStyleId] || EMAIL_STYLES.classic

  return (
    <Html>
      <Head />
      <Preview>It's your turn in Rummikub game {roomCode}!</Preview>
      <Body style={{ ...main, backgroundColor: colors.background }}>
        <Container style={container}>
          <Heading style={{ ...h1, color: colors.accent }}>Your Turn!</Heading>
          <Text style={text}>Hey {playerName}, it's your turn in the Rummikub game!</Text>
          <Text style={text}>
            Room Code: <strong>{roomCode}</strong>
          </Text>

          {playerStandings && playerStandings.length > 0 && (
            <>
              <Hr style={divider} />
              <Text style={standingsTitle}>Current Standings:</Text>
              {playerStandings
                .sort((a, b) => a.tileCount - b.tileCount)
                .map((player, index) => (
                  <Text
                    key={index}
                    style={player.name === playerName ? { ...standingRowHighlight, color: colors.accent } : standingRow}
                  >
                    {player.name}: <strong>{player.tileCount} tiles</strong>
                    {player.tileCount === 0 && " 🏆"}
                  </Text>
                ))}
              <Hr style={divider} />
            </>
          )}

          <Section style={buttonContainer}>
            <Button style={{ ...button, backgroundColor: colors.accent }} href={gameUrl}>
              Play Now
            </Button>
          </Section>
          <Text style={footer}>Don't keep the other players waiting!</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#0f172a",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
}

const h1 = {
  color: "#2dd4bf",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0 0 20px",
  textAlign: "center" as const,
}

const text = {
  color: "#e2e8f0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
  textAlign: "center" as const,
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#2dd4bf",
  borderRadius: "8px",
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
}

const footer = {
  color: "#94a3b8",
  fontSize: "14px",
  margin: "32px 0 0",
  textAlign: "center" as const,
}

const divider = {
  borderColor: "#334155",
  margin: "24px 0",
}

const standingsTitle = {
  color: "#94a3b8",
  fontSize: "14px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 12px",
  textAlign: "center" as const,
}

const standingRow = {
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
  textAlign: "center" as const,
}

const standingRowHighlight = {
  color: "#2dd4bf",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
  textAlign: "center" as const,
  fontWeight: "600",
}
