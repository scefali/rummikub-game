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
  lastSeenMeldTileIds?: string[] // Tile IDs on board when player last ended turn
  queuedTurn?: QueuedTurn | null // Add queued turn for async play
}

// QueuedTurn type for offline turn queueing
export interface QueuedTurn {
  id: string
  queuedAt: number
  baseRevision: number
  baseBoardSignature: string
  plannedMelds: Meld[]
  plannedHand: Tile[]
  plannedWorkingArea: Tile[]
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
  revision: number // Track state version for queued turn validation
}

// Room state
export interface Room {
  code: string
  gameState: GameState
  createdAt: number
  roomStyleId: RoomStyleId // Add roomStyleId
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

export type RoomStyleId = "classic" | "ocean" | "forest" | "sunset" | "neon"

export interface RoomStyle {
  id: RoomStyleId
  name: string
  background: string
  accent: string
}

export const ROOM_STYLES: Record<RoomStyleId, RoomStyle> = {
  classic: {
    id: "classic",
    name: "Classic",
    background: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
    accent: "text-emerald-500",
  },
  ocean: {
    id: "ocean",
    name: "Ocean Waves",
    background: "bg-gradient-to-br from-blue-950 via-cyan-900 to-blue-950",
    accent: "text-cyan-400",
  },
  forest: {
    id: "forest",
    name: "Forest",
    background: "bg-gradient-to-br from-green-950 via-emerald-900 to-green-950",
    accent: "text-emerald-400",
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    background: "bg-gradient-to-br from-orange-950 via-rose-900 to-purple-950",
    accent: "text-orange-400",
  },
  neon: {
    id: "neon",
    name: "Neon Night",
    background: "bg-gradient-to-br from-purple-950 via-fuchsia-900 to-violet-950",
    accent: "text-fuchsia-400",
  },
}
