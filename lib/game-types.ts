// Tile colors for Rummikub
export type TileColor = "red" | "blue" | "yellow" | "black"

// Represents a single tile
export interface Tile {
  id: string
  color: TileColor
  number: number // 1-13, or 0 for joker
  isJoker: boolean
  assignedNumber?: number // The number this joker represents in a meld
  assignedColor?: TileColor // The color this joker represents in a meld (for sets)
}

// A meld is a valid group of tiles on the table
export interface Meld {
  id: string
  tiles: Tile[]
}

// Player information
export interface Player {
  id: string
  name: string
  isHost: boolean
  hand: Tile[]
  hasInitialMeld: boolean // Has placed 30+ points initially
  isConnected: boolean
  email?: string // Optional email field
  playerCode: string // 6-character code for cross-device login
}

// Game phases
export type GamePhase = "lobby" | "playing" | "ended"

// Game state
export interface GameState {
  phase: GamePhase
  players: Player[]
  currentPlayerIndex: number
  melds: Meld[]
  tilePool: Tile[]
  winner: string | null
  turnStartMelds: Meld[] // Snapshot at turn start for validation
  turnStartHand: Tile[] // Snapshot of hand at turn start
  workingArea: Tile[] // Tiles taken from board being rearranged
  rules?: GameRules // Add rules to game state (set when game starts)
}

// Room state
export interface Room {
  code: string
  gameState: GameState
  createdAt: number
}

// WebSocket message types
export type MessageType =
  | "join_room"
  | "room_joined"
  | "player_joined"
  | "player_left"
  | "start_game"
  | "game_started"
  | "game_state_update"
  | "play_tiles"
  | "draw_tile"
  | "end_turn"
  | "error"
  | "room_not_found"
  | "game_ended"

export interface WebSocketMessage {
  type: MessageType
  payload?: unknown
}

// Game constants
export const STANDARD_HAND_SIZE = 14
export const STANDARD_MELD_POINTS = 30
export const LARGE_GAME_HAND_SIZE = 12
export const LARGE_GAME_MELD_POINTS = 25
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6 // Increase max players from 4 to 6
export const LARGE_GAME_THRESHOLD = 5 // 5+ players triggers large game rules

export function getRulesForPlayerCount(playerCount: number): GameRules {
  if (playerCount >= LARGE_GAME_THRESHOLD) {
    return {
      mode: "large",
      startingHandSize: LARGE_GAME_HAND_SIZE,
      initialMeldThreshold: LARGE_GAME_MELD_POINTS,
    }
  }
  return {
    mode: "standard",
    startingHandSize: STANDARD_HAND_SIZE,
    initialMeldThreshold: STANDARD_MELD_POINTS,
  }
}

export type RulesMode = "standard" | "large"

export interface GameRules {
  mode: RulesMode
  startingHandSize: number
  initialMeldThreshold: number
}
