import type { Tile, TileColor, Meld, GameState, Player } from "./game-types"
import { INITIAL_HAND_SIZE } from "./game-types"

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Generate room code (4-6 uppercase letters)
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ" // Removed confusing letters
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Create the full tile set (106 tiles)
export function createTileSet(): Tile[] {
  const tiles: Tile[] = []
  const colors: TileColor[] = ["red", "blue", "yellow", "black"]

  // Two sets of 1-13 in each color
  for (let set = 0; set < 2; set++) {
    for (const color of colors) {
      for (let num = 1; num <= 13; num++) {
        tiles.push({
          id: generateId(),
          color,
          number: num,
          isJoker: false,
        })
      }
    }
  }

  // Add 2 jokers
  tiles.push({ id: generateId(), color: "red", number: 0, isJoker: true })
  tiles.push({ id: generateId(), color: "black", number: 0, isJoker: true })

  return tiles
}

// Shuffle array in place
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Initialize a new game
export function initializeGame(playerIds: { id: string; name: string; isHost: boolean }[]): GameState {
  const tiles = shuffle(createTileSet())
  const players: Player[] = []

  for (const { id, name, isHost } of playerIds) {
    const hand = tiles.splice(0, INITIAL_HAND_SIZE)
    players.push({
      id,
      name,
      isHost,
      hand,
      hasInitialMeld: false,
      isConnected: true,
    })
  }

  return {
    phase: "playing",
    players,
    currentPlayerIndex: 0,
    melds: [],
    tilePool: tiles,
    winner: null,
    turnStartMelds: [],
    turnStartHand: [],
  }
}

// Check if a meld is a valid set (same number, different colors)
export function isValidSet(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false

  const nonJokers = tiles.filter((t) => !t.isJoker)
  if (nonJokers.length === 0) return false

  const targetNumber = nonJokers[0].number
  const colors = new Set<TileColor>()

  for (const tile of tiles) {
    if (!tile.isJoker) {
      if (tile.number !== targetNumber) return false
      if (colors.has(tile.color)) return false
      colors.add(tile.color)
    }
  }

  return true
}

// Check if a meld is a valid run (consecutive numbers, same color)
export function isValidRun(tiles: Tile[]): boolean {
  if (tiles.length < 3) return false

  const nonJokers = tiles.filter((t) => !t.isJoker)
  if (nonJokers.length === 0) return false

  const targetColor = nonJokers[0].color
  for (const tile of nonJokers) {
    if (tile.color !== targetColor) return false
  }

  // Sort by number to check consecutive
  const sorted = [...tiles].sort((a, b) => {
    if (a.isJoker && b.isJoker) return 0
    if (a.isJoker) return 1
    if (b.isJoker) return -1
    return a.number - b.number
  })

  // Determine the sequence with jokers filling gaps
  let jokerCount = tiles.filter((t) => t.isJoker).length
  const numbers = nonJokers.map((t) => t.number).sort((a, b) => a - b)

  if (numbers.length === 0) return jokerCount >= 3

  let current = numbers[0]
  let numIndex = 0

  for (let i = 0; i < tiles.length; i++) {
    if (current > 13) return false

    if (numIndex < numbers.length && numbers[numIndex] === current) {
      numIndex++
    } else if (jokerCount > 0) {
      jokerCount--
    } else {
      return false
    }
    current++
  }

  return true
}

// Check if a meld is valid (either a set or a run)
export function isValidMeld(meld: Meld): boolean {
  return isValidSet(meld.tiles) || isValidRun(meld.tiles)
}

// Calculate the point value of tiles (for initial 30-point requirement)
export function calculateMeldPoints(tiles: Tile[]): number {
  return tiles.reduce((sum, tile) => sum + (tile.isJoker ? 0 : tile.number), 0)
}

// Validate all melds on the table
export function validateAllMelds(melds: Meld[]): boolean {
  return melds.every(isValidMeld)
}

// Check if player can end their turn (all melds valid, initial meld requirement met)
export function canEndTurn(
  player: Player,
  melds: Meld[],
  turnStartHand: Tile[],
  turnStartMelds: Meld[],
): { valid: boolean; reason?: string } {
  // All melds must be valid
  if (!validateAllMelds(melds)) {
    return { valid: false, reason: "Some melds on the table are invalid" }
  }

  // Check if player has placed any tiles
  const tilesPlayed = turnStartHand.length - player.hand.length
  if (tilesPlayed <= 0) {
    return { valid: false, reason: "You must play at least one tile or draw" }
  }

  // Check initial meld requirement
  if (!player.hasInitialMeld) {
    // Calculate points from new melds only
    const newTileIds = new Set(turnStartHand.filter((t) => !player.hand.some((h) => h.id === t.id)).map((t) => t.id))

    let newMeldPoints = 0
    for (const meld of melds) {
      const meldNewTiles = meld.tiles.filter((t) => newTileIds.has(t.id))
      if (meldNewTiles.length === meld.tiles.length) {
        // Entire meld is new
        newMeldPoints += calculateMeldPoints(meld.tiles)
      }
    }

    if (newMeldPoints < 30) {
      return {
        valid: false,
        reason: `Initial meld must be at least 30 points (you have ${newMeldPoints})`,
      }
    }
  }

  return { valid: true }
}

// Draw a tile from the pool
export function drawTile(gameState: GameState): Tile | null {
  if (gameState.tilePool.length === 0) return null
  return gameState.tilePool.pop() || null
}

// Move to next player
export function nextPlayer(gameState: GameState): number {
  const connectedPlayers = gameState.players.filter((p) => p.isConnected)
  if (connectedPlayers.length === 0) return gameState.currentPlayerIndex

  let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
  while (!gameState.players[nextIndex].isConnected) {
    nextIndex = (nextIndex + 1) % gameState.players.length
  }
  return nextIndex
}

// Check if game has ended
export function checkGameEnd(gameState: GameState): { ended: boolean; winner?: string } {
  // Check if any player has no tiles
  for (const player of gameState.players) {
    if (player.hand.length === 0) {
      return { ended: true, winner: player.id }
    }
  }

  // Check if pool is empty and no one can play
  if (gameState.tilePool.length === 0) {
    // For simplicity, game continues until someone goes out
    // In full implementation, would check if anyone can play
  }

  return { ended: false }
}
