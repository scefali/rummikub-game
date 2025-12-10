import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from "@react-email/components"
import type { RoomStyleId } from "../game-types"

interface GameLinkEmailProps {
  playerName: string
  roomCode: string
  gameUrl: string
  roomStyleId?: RoomStyleId
  allPlayerNames: string[]
  gameStartedAt: string
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

export function GameLinkEmail({
  playerName,
  roomCode,
  gameUrl,
  roomStyleId = "classic",
  allPlayerNames,
  gameStartedAt,
}: GameLinkEmailProps) {
  const colors = EMAIL_STYLES[roomStyleId] || EMAIL_STYLES.classic
  const firstName = playerName.split(" ")[0]
  const allFirstNames = allPlayerNames.map((name) => name.split(" ")[0])

  const formatPacificTime = (isoString: string) => {
    const date = new Date(isoString)
    return (
      date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Los_Angeles",
      }) + " PT"
    )
  }

  return (
    <Html>
      <Head />
      <Preview>
        Your Rummikub game link for room {roomCode} - {allFirstNames.join(", ")}
      </Preview>
      <Body style={{ ...main, backgroundColor: colors.background }}>
        <Container style={container}>
          <Heading style={{ ...h1, color: colors.accent }}>Game Started!</Heading>
          <Text style={text}>
            Hey {firstName}, your Rummikub game in room <strong>{roomCode}</strong> has started!
          </Text>

          <Section style={{ ...infoBox, backgroundColor: colors.secondary }}>
            <Text style={infoLabel}>Players</Text>
            <Text style={infoValue}>{allFirstNames.join(", ")}</Text>
            <Text style={infoLabel}>Started</Text>
            <Text style={infoValue}>{formatPacificTime(gameStartedAt)}</Text>
          </Section>

          <Hr style={divider} />

          <Text style={text}>Save this link to rejoin the game anytime:</Text>

          <Section style={buttonContainer}>
            <Button style={{ ...button, backgroundColor: colors.accent }} href={gameUrl}>
              Open Game
            </Button>
          </Section>

          <Text style={linkText}>Or copy this link: {gameUrl}</Text>

          <Hr style={divider} />

          <Text style={footer}>Bookmark this email in case you need to rejoin later!</Text>
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

const infoBox = {
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
}

const infoLabel = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
  textAlign: "center" as const,
}

const infoValue = {
  color: "#e2e8f0",
  fontSize: "16px",
  margin: "0 0 12px",
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

const linkText = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 16px",
  textAlign: "center" as const,
  wordBreak: "break-all" as const,
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
