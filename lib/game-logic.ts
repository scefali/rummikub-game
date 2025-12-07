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
    workingArea: [],
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

export function processMeld(meld: Meld): Meld {
  if (isValidRun(meld.tiles)) {
    return { ...meld, tiles: assignJokerValuesInRun(meld.tiles) }
  } else if (isValidSet(meld.tiles)) {
    return { ...meld, tiles: assignJokerValuesInSet(meld.tiles) }
  }
  return meld
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
  workingArea: Tile[] = [],
): { valid: boolean; reason?: string } {
  // Working area must be empty - all tiles must be placed in melds
  if (workingArea.length > 0) {
    return { valid: false, reason: "All tiles in the working area must be placed in melds" }
  }

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

export function reshuffleTable(
  melds: Meld[],
  workingArea: Tile[] = [],
): { success: boolean; newMelds: Meld[]; remainingTiles: Tile[] } {
  // Collect all tiles from melds and working area
  const allTiles: Tile[] = [...melds.flatMap((m) => m.tiles), ...workingArea]

  if (allTiles.length === 0) {
    return { success: true, newMelds: [], remainingTiles: [] }
  }

  // Try to find a valid arrangement of all tiles
  const result = findValidArrangement(allTiles)

  if (result.success) {
    return {
      success: true,
      newMelds: result.melds,
      remainingTiles: result.remainingTiles,
    }
  }

  return { success: false, newMelds: melds, remainingTiles: workingArea }
}

// Recursive backtracking algorithm to find valid meld arrangements
function findValidArrangement(tiles: Tile[]): { success: boolean; melds: Meld[]; remainingTiles: Tile[] } {
  // Shuffle tiles for randomness in solutions
  const shuffledTiles = shuffle([...tiles])

  // Try to find all possible melds
  const possibleMelds = findAllPossibleMelds(shuffledTiles)

  // Shuffle possible melds for variety
  const shuffledMelds = shuffle(possibleMelds)

  // Use backtracking to find a combination that uses all tiles
  const result = backtrackMelds(shuffledTiles, shuffledMelds, [])

  if (result.success) {
    return result
  }

  // If we can't use all tiles, return the best we found
  return { success: false, melds: [], remainingTiles: tiles }
}

function findAllPossibleMelds(tiles: Tile[]): Meld[] {
  const melds: Meld[] = []
  const tilesByColor: Record<TileColor, Tile[]> = {
    red: [],
    blue: [],
    yellow: [],
    black: [],
  }
  const tilesByNumber: Record<number, Tile[]> = {}
  const jokers = tiles.filter((t) => t.isJoker)

  // Group tiles
  for (const tile of tiles) {
    if (!tile.isJoker) {
      tilesByColor[tile.color].push(tile)
      if (!tilesByNumber[tile.number]) {
        tilesByNumber[tile.number] = []
      }
      tilesByNumber[tile.number].push(tile)
    }
  }

  // Find all possible runs (consecutive numbers, same color)
  for (const color of ["red", "blue", "yellow", "black"] as TileColor[]) {
    const colorTiles = tilesByColor[color].sort((a, b) => a.number - b.number)

    // Try runs of different lengths starting at different positions
    for (let start = 0; start < colorTiles.length; start++) {
      for (let len = 3; len <= Math.min(13, colorTiles.length - start + jokers.length); len++) {
        const runTiles: Tile[] = []
        let numIndex = start
        let jokersUsed = 0
        let currentNum = colorTiles[start]?.number || 1

        for (let i = 0; i < len && currentNum <= 13; i++) {
          if (numIndex < colorTiles.length && colorTiles[numIndex].number === currentNum) {
            runTiles.push(colorTiles[numIndex])
            numIndex++
          } else if (jokersUsed < jokers.length) {
            runTiles.push(jokers[jokersUsed])
            jokersUsed++
          } else {
            break
          }
          currentNum++
        }

        if (runTiles.length >= 3 && isValidRun(runTiles)) {
          melds.push({ id: generateId(), tiles: [...runTiles] })
        }
      }
    }
  }

  // Find all possible sets (same number, different colors)
  for (const num in tilesByNumber) {
    const numTiles = tilesByNumber[num]
    const uniqueColorTiles: Tile[] = []
    const seenColors = new Set<TileColor>()

    for (const tile of numTiles) {
      if (!seenColors.has(tile.color)) {
        seenColors.add(tile.color)
        uniqueColorTiles.push(tile)
      }
    }

    // Sets of 3 or 4 tiles
    if (uniqueColorTiles.length >= 3) {
      melds.push({ id: generateId(), tiles: uniqueColorTiles.slice(0, 3) })
    }
    if (uniqueColorTiles.length >= 4) {
      melds.push({ id: generateId(), tiles: uniqueColorTiles.slice(0, 4) })
    }

    // With jokers
    if (uniqueColorTiles.length >= 2 && jokers.length > 0) {
      melds.push({ id: generateId(), tiles: [...uniqueColorTiles.slice(0, 2), jokers[0]] })
    }
  }

  return melds
}

function backtrackMelds(
  remainingTiles: Tile[],
  possibleMelds: Meld[],
  currentMelds: Meld[],
): { success: boolean; melds: Meld[]; remainingTiles: Tile[] } {
  // If no tiles remaining, we found a valid solution
  if (remainingTiles.length === 0) {
    return { success: true, melds: currentMelds, remainingTiles: [] }
  }

  // Try each possible meld
  for (const meld of possibleMelds) {
    // Check if all tiles in this meld are still available
    const meldTileIds = new Set(meld.tiles.map((t) => t.id))
    const canUseMeld = meld.tiles.every((t) => remainingTiles.some((rt) => rt.id === t.id))

    if (canUseMeld) {
      // Remove these tiles from remaining
      const newRemaining = remainingTiles.filter((t) => !meldTileIds.has(t.id))

      // Filter out melds that use any of the tiles we just used
      const newPossible = possibleMelds.filter((m) => !m.tiles.some((t) => meldTileIds.has(t.id)))

      // Create new meld with fresh ID
      const newMeld: Meld = { id: generateId(), tiles: meld.tiles }

      // Recurse
      const result = backtrackMelds(newRemaining, newPossible, [...currentMelds, newMeld])

      if (result.success) {
        return result
      }
    }
  }

  // No valid arrangement found with current tiles
  // Return best effort - melds we have so far
  return { success: false, melds: currentMelds, remainingTiles }
}
