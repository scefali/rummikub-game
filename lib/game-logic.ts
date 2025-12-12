import type { Tile, TileColor, Meld, GameState, Player, GameRules } from "./game-types"
import { getRulesForPlayerCount, STANDARD_MELD_POINTS } from "./game-types"

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Generate 6-character player code for cross-device login
export function generatePlayerCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed confusing characters
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Generate room code (4-6 uppercase letters)
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ" // Removed confusing characters
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
export function initializeGame(
  playerIds: {
    id: string
    name: string
    isHost: boolean
    playerCode?: string
    email?: string
    hasInitialMeld?: boolean
  }[],
  rules?: GameRules,
): GameState {
  // Determine rules based on player count if not provided
  const gameRules = rules || getRulesForPlayerCount(playerIds.length)

  const tiles = shuffle(createTileSet())
  const players: Player[] = []

  for (const { id, name, isHost, playerCode, email } of playerIds) {
    const hand = tiles.splice(0, gameRules.startingHandSize)
    players.push({
      id,
      name,
      isHost,
      hand,
      hasInitialMeld: false,
      isConnected: true,
      playerCode: playerCode || generatePlayerCode(),
      email,
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
    workingArea: [],
    rules: gameRules,
  }
}

function assignJokerValuesInRun(tiles: Tile[]): Tile[] {
  const nonJokers = tiles.filter((t) => !t.isJoker)
  if (nonJokers.length === 0) return tiles

  const targetColor = nonJokers[0].color
  const numbers = nonJokers.map((t) => t.number).sort((a, b) => a - b)

  // Find the minimum starting point considering jokers can extend the run
  const jokerCount = tiles.filter((t) => t.isJoker).length
  const minNum = Math.max(1, numbers[0] - jokerCount)
  const maxNum = Math.min(13, numbers[numbers.length - 1] + jokerCount)

  // Try to find a valid sequence
  for (let start = minNum; start <= numbers[0]; start++) {
    const sequence: Tile[] = []
    let jokerIdx = 0
    const jokers = tiles.filter((t) => t.isJoker)
    let numIdx = 0
    let valid = true

    for (let num = start; num < start + tiles.length && num <= 13; num++) {
      if (numIdx < numbers.length && numbers[numIdx] === num) {
        sequence.push(nonJokers.find((t) => t.number === num && !sequence.includes(t))!)
        numIdx++
      } else if (jokerIdx < jokers.length) {
        // Assign this number to the joker
        sequence.push({
          ...jokers[jokerIdx],
          assignedNumber: num,
          assignedColor: targetColor,
        })
        jokerIdx++
      } else {
        valid = false
        break
      }
    }

    if (valid && sequence.length === tiles.length && numIdx === nonJokers.length && jokerIdx === jokers.length) {
      return sequence
    }
  }

  // Fallback: return original order
  return tiles
}

function assignJokerValuesInSet(tiles: Tile[]): Tile[] {
  const nonJokers = tiles.filter((t) => !t.isJoker)
  if (nonJokers.length === 0) return tiles

  const targetNumber = nonJokers[0].number
  const usedColors = new Set(nonJokers.map((t) => t.color))
  const availableColors: TileColor[] = ["red", "blue", "yellow", "black"].filter(
    (c) => !usedColors.has(c as TileColor),
  ) as TileColor[]

  let colorIdx = 0
  return tiles.map((tile) => {
    if (tile.isJoker && colorIdx < availableColors.length) {
      return {
        ...tile,
        assignedNumber: targetNumber,
        assignedColor: availableColors[colorIdx++],
      }
    }
    return tile
  })
}

export function sortTilesForDisplay(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // Jokers go to the end if not assigned
    if (a.isJoker && !a.assignedNumber && b.isJoker && !b.assignedNumber) return 0
    if (a.isJoker && !a.assignedNumber) return 1
    if (b.isJoker && !b.assignedNumber) return -1

    // Sort by number first
    const numA = a.isJoker ? (a.assignedNumber ?? 0) : a.number
    const numB = b.isJoker ? (b.assignedNumber ?? 0) : b.number
    if (numA !== numB) return numA - numB

    // Then by color for same numbers
    const colorOrder: Record<TileColor, number> = { red: 0, blue: 1, yellow: 2, black: 3 }
    const colorA = a.isJoker ? (a.assignedColor ?? a.color) : a.color
    const colorB = b.isJoker ? (b.assignedColor ?? b.color) : b.color
    return colorOrder[colorA] - colorOrder[colorB]
  })
}

export function processMeld(meld: Meld): Meld {
  if (isValidRun(meld.tiles)) {
    return { ...meld, tiles: assignJokerValuesInRun(meld.tiles) }
  } else if (isValidSet(meld.tiles)) {
    return { ...meld, tiles: assignJokerValuesInSet(meld.tiles) }
  }
  return { ...meld, tiles: sortTilesForDisplay(meld.tiles) }
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

  // Create a working array with actual numbers (using assignedNumber for jokers)
  const tilesWithNumbers = tiles.map((tile) => ({
    tile,
    number: tile.isJoker ? (tile.assignedNumber ?? -1) : tile.number,
    color: tile.isJoker ? (tile.assignedColor ?? tile.color) : tile.color,
  }))

  // Check if any joker doesn't have an assigned number - need to validate differently
  const unassignedJokers = tilesWithNumbers.filter((t) => t.number === -1)

  if (unassignedJokers.length > 0) {
    // Original validation logic for unassigned jokers
    let jokerCount = tiles.filter((t) => !t.isJoker || !t.assignedNumber).length
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

  // All jokers have assigned numbers - validate the complete sequence
  // Sort by number
  const sorted = [...tilesWithNumbers].sort((a, b) => a.number - b.number)

  // Check if jokers match the target color
  for (const item of sorted) {
    if (item.tile.isJoker && item.color !== targetColor) {
      return false
    }
  }

  // Check consecutive numbers
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number !== sorted[i - 1].number + 1) {
      return false
    }
    // Also check we don't exceed 13
    if (sorted[i].number > 13) {
      return false
    }
  }

  return true
}

// Check if a meld is valid (either a set or a run)
export function isValidMeld(meld: Meld): boolean {
  return isValidSet(meld.tiles) || isValidRun(meld.tiles)
}

// Calculate the point value of tiles (for initial 30-point requirement)
export function calculateMeldPoints(tiles: Tile[]): number {
  return tiles.reduce((sum, tile) => {
    if (tile.isJoker) {
      // Use assigned number if available (from a processed meld)
      return sum + (tile.assignedNumber ?? 0)
    }
    return sum + tile.number
  }, 0)
}

export function calculateProcessedMeldPoints(meld: Meld): number {
  const processed = processMeld(meld)
  return calculateMeldPoints(processed.tiles)
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

// Check if player can end their turn (all melds valid, initial meld requirement met)
export function canEndTurn(
  player: Player,
  melds: Meld[],
  turnStartHand: Tile[],
  turnStartMelds: Meld[],
  workingArea: Tile[] = [],
  rules?: GameRules,
): { valid: boolean; reason?: string } {
  // Working area must be empty - all tiles must be placed in melds
  if (workingArea.length > 0) {
    return { valid: false, reason: "All tiles in the working area must be placed in melds" }
  }

  // All melds must be valid
  const validateAllMelds = (melds: Meld[]): boolean => {
    return melds.every((meld) => isValidMeld(meld))
  }

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
    const threshold = rules?.initialMeldThreshold ?? STANDARD_MELD_POINTS

    // Calculate points from new melds only
    const newTileIds = new Set(turnStartHand.filter((t) => !player.hand.some((h) => h.id === t.id)).map((t) => t.id))

    let newMeldPoints = 0
    for (const meld of melds) {
      const meldNewTiles = meld.tiles.filter((t) => newTileIds.has(t.id))
      if (meldNewTiles.length === meld.tiles.length) {
        // Entire meld is new - process it to assign joker values before calculating points
        newMeldPoints += calculateProcessedMeldPoints(meld)
      }
    }

    if (newMeldPoints < threshold) {
      return {
        valid: false,
        reason: `Initial meld must be at least ${threshold} points (you have ${newMeldPoints})`,
      }
    }
  }

  return { valid: true }
}

export function findValidSplitPoint(meld: Meld): number | null {
  // Only runs can be split, and need at least 6 tiles to make two valid melds of 3
  if (!isValidRun(meld.tiles) || meld.tiles.length < 6) return null

  // Process the meld to get proper tile order
  const processed = processMeld(meld)

  // Find first split point that creates two valid melds (each with 3+ tiles)
  // Start from position 3 (minimum size for first meld)
  for (let splitAt = 3; splitAt <= processed.tiles.length - 3; splitAt++) {
    const firstPart = processed.tiles.slice(0, splitAt)
    const secondPart = processed.tiles.slice(splitAt)

    // Check if both parts would be valid melds
    const firstMeld: Meld = { id: "temp1", tiles: firstPart }
    const secondMeld: Meld = { id: "temp2", tiles: secondPart }

    if (isValidMeld(firstMeld) && isValidMeld(secondMeld)) {
      return splitAt
    }
  }

  return null
}

export function calculateHandPoints(hand: Tile[]): number {
  return hand.reduce((sum, tile) => sum + (tile.isJoker ? 30 : tile.number), 0)
}
