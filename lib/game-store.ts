import { Redis } from "@upstash/redis"
import type { Room, GameState, Player, Meld, Tile, RoomStyleId } from "./game-types"
import { MAX_PLAYERS, MIN_PLAYERS, getRulesForPlayerCount } from "./game-types"
import {
  generateRoomCode,
  generateId,
  generatePlayerCode,
  initializeGame,
  drawTile,
  nextPlayer,
  checkGameEnd,
  canEndTurn,
} from "./game-logic"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const ROOM_TTL = 30 * 24 * 60 * 60 // 30 days

function roomKey(code: string): string {
  return `room:${code.toUpperCase()}`
}

async function getRoom(code: string): Promise<Room | null> {
  const key = roomKey(code)
  console.log("[v0] Getting room from Redis:", key)
  try {
    const room = await redis.get<Room>(key)
    console.log("[v0] Redis get result:", room ? "Room found" : "Room not found")
    return room
  } catch (err) {
    console.log("[v0] Redis get error:", err)
    return null
  }
}

async function setRoom(room: Room): Promise<void> {
  const key = roomKey(room.code)
  console.log("[v0] Saving room to Redis:", key)
  try {
    await redis.set(key, room, { ex: ROOM_TTL })
    console.log("[v0] Room saved successfully")
  } catch (err) {
    console.log("[v0] Redis set error:", err)
  }
}

export async function createRoom(
  playerName: string,
  playerEmail?: string,
): Promise<{ roomCode: string; playerId: string; playerCode: string; gameState: GameState; roomStyleId: RoomStyleId }> {
  const roomCode = generateRoomCode()
  const playerId = generateId()
  const playerCode = generatePlayerCode()

  const player: Player = {
    id: playerId,
    name: playerName,
    isHost: true,
    hand: [],
    hasInitialMeld: false,
    isConnected: true,
    email: playerEmail || undefined,
    playerCode,
  }

  const room: Room = {
    code: roomCode,
    gameState: {
      phase: "lobby",
      players: [player],
      currentPlayerIndex: 0,
      melds: [],
      tilePool: [],
      winner: null,
      turnStartMelds: [],
      turnStartHand: [],
      workingArea: [],
      rules: getRulesForPlayerCount(1),
    },
    createdAt: Date.now(),
    roomStyleId: "classic",
  }

  await setRoom(room)

  return { roomCode, playerId, playerCode, gameState: room.gameState, roomStyleId: room.roomStyleId }
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
  playerEmail?: string,
): Promise<{
  success: boolean
  playerId?: string
  playerCode?: string
  gameState?: GameState
  roomStyleId?: RoomStyleId
  error?: string
}> {
  const code = roomCode.toUpperCase()
  const room = await getRoom(code)

  if (!room) {
    return { success: false, error: "Room not found" }
  }

  if (room.gameState.phase !== "lobby") {
    return { success: false, error: "Game already in progress" }
  }

  if (room.gameState.players.length >= MAX_PLAYERS) {
    return { success: false, error: "Room is full" }
  }

  const playerId = generateId()
  const playerCode = generatePlayerCode()

  const player: Player = {
    id: playerId,
    name: playerName,
    isHost: false,
    hand: [],
    hasInitialMeld: false,
    isConnected: true,
    email: playerEmail || undefined,
    playerCode,
  }

  room.gameState.players.push(player)
  await setRoom(room)

  return { success: true, playerId, playerCode, gameState: room.gameState, roomStyleId: room.roomStyleId }
}

export async function loginWithCode(
  roomCode: string,
  playerCode: string,
): Promise<{ success: boolean; playerId?: string; playerName?: string; error?: string }> {
  const code = roomCode.toUpperCase()
  const room = await getRoom(code)

  if (!room) {
    return { success: false, error: "Room not found" }
  }

  const player = room.gameState.players.find((p) => p.playerCode === playerCode.toUpperCase())
  if (!player) {
    return { success: false, error: "Invalid player code" }
  }

  // Mark player as connected
  player.isConnected = true
  await setRoom(room)

  return { success: true, playerId: player.id, playerName: player.name }
}

export async function getGameState(
  roomCode: string,
  playerId: string,
): Promise<{ gameState: GameState; roomStyleId: RoomStyleId } | null> {
  const room = await getRoom(roomCode)
  if (!room) return null

  return {
    gameState: {
      ...room.gameState,
      players: room.gameState.players.map((p) => ({
        ...p,
        hand: p.id === playerId ? p.hand : [],
        handCount: p.hand.length,
        playerCode: p.id === playerId ? p.playerCode : undefined,
      })) as Player[],
    },
    roomStyleId: room.roomStyleId || "classic",
  }
}

export async function startGame(
  roomCode: string,
  playerId: string,
): Promise<{ success: boolean; gameState?: GameState; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, error: "Room not found" }

  const player = room.gameState.players.find((p) => p.id === playerId)
  if (!player?.isHost) {
    return { success: false, error: "Only the host can start the game" }
  }

  if (room.gameState.players.length < MIN_PLAYERS) {
    return { success: false, error: `Need at least ${MIN_PLAYERS} players to start` }
  }

  const playerData = room.gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    playerCode: p.playerCode,
    email: p.email,
    hasInitialMeld: false,
  }))

  const rules = getRulesForPlayerCount(playerData.length)
  room.gameState = initializeGame(playerData, rules)

  room.gameState.players.forEach((p) => {
    p.hasInitialMeld = false
  })

  const currentPlayer = room.gameState.players[0]
  room.gameState.turnStartHand = [...currentPlayer.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))

  await setRoom(room)

  return { success: true, gameState: room.gameState }
}

export async function playTiles(
  roomCode: string,
  playerId: string,
  melds: Meld[],
  hand: Tile[],
  workingArea: Tile[] = [],
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room || room.gameState.phase !== "playing") {
    return { success: false, error: "Game not in progress" }
  }

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Not your turn" }
  }

  room.gameState.melds = melds
  currentPlayer.hand = hand
  room.gameState.workingArea = workingArea
  await setRoom(room)

  return { success: true }
}

export async function handleDrawTile(
  roomCode: string,
  playerId: string,
): Promise<{
  success: boolean
  drawnTile?: Tile
  error?: string
  nextPlayer?: { name: string; email?: string; playerCode?: string }
  playerStandings?: { name: string; tileCount: number }[]
}> {
  const room = await getRoom(roomCode)
  if (!room || room.gameState.phase !== "playing") {
    return { success: false, error: "Game not in progress" }
  }

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Not your turn" }
  }

  // Revert any changes made during the turn
  room.gameState.melds = JSON.parse(JSON.stringify(room.gameState.turnStartMelds))
  currentPlayer.hand = [...room.gameState.turnStartHand]
  room.gameState.workingArea = []

  const tile = drawTile(room.gameState)
  if (tile) {
    currentPlayer.hand.push(tile)
  }

  // Move to next player
  room.gameState.currentPlayerIndex = nextPlayer(room.gameState)
  const nextPlayerObj = room.gameState.players[room.gameState.currentPlayerIndex]
  room.gameState.turnStartHand = [...nextPlayerObj.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))

  await setRoom(room)

  const playerStandings = room.gameState.players.map((p) => ({
    name: p.name,
    tileCount: p.hand.length,
  }))

  return {
    success: true,
    drawnTile: tile || undefined,
    nextPlayer: {
      name: nextPlayerObj.name,
      email: nextPlayerObj.email,
      playerCode: nextPlayerObj.playerCode,
    },
    playerStandings,
  }
}

export async function handleEndTurn(
  roomCode: string,
  playerId: string,
): Promise<{
  success: boolean
  error?: string
  gameEnded?: boolean
  winner?: string
  nextPlayer?: { name: string; email?: string; playerCode?: string }
  playerStandings?: { name: string; tileCount: number }[]
}> {
  const room = await getRoom(roomCode)
  if (!room || room.gameState.phase !== "playing") {
    return { success: false, error: "Game not in progress" }
  }

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Not your turn" }
  }

  const validation = canEndTurn(
    currentPlayer,
    room.gameState.melds,
    room.gameState.turnStartHand,
    room.gameState.turnStartMelds,
    room.gameState.workingArea,
    room.gameState.rules,
  )

  if (!validation.valid) {
    return { success: false, error: validation.reason || "Invalid turn" }
  }

  if (!currentPlayer.hasInitialMeld) {
    currentPlayer.hasInitialMeld = true
  }

  const endCheck = checkGameEnd(room.gameState)
  if (endCheck.ended) {
    room.gameState.phase = "ended"
    room.gameState.winner = endCheck.winner || null
    await setRoom(room)
    return { success: true, gameEnded: true, winner: endCheck.winner }
  }

  room.gameState.currentPlayerIndex = nextPlayer(room.gameState)
  const nextPlayerObj = room.gameState.players[room.gameState.currentPlayerIndex]
  room.gameState.turnStartHand = [...nextPlayerObj.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))
  room.gameState.workingArea = []

  await setRoom(room)

  const playerStandings = room.gameState.players.map((p) => ({
    name: p.name,
    tileCount: p.hand.length,
  }))

  return {
    success: true,
    nextPlayer: {
      name: nextPlayerObj.name,
      email: nextPlayerObj.email,
      playerCode: nextPlayerObj.playerCode,
    },
    playerStandings,
  }
}

export async function resetTurn(roomCode: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room || room.gameState.phase !== "playing") {
    return { success: false, error: "Game not in progress" }
  }

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Not your turn" }
  }

  // Restore to turn start state
  room.gameState.melds = JSON.parse(JSON.stringify(room.gameState.turnStartMelds))
  currentPlayer.hand = [...room.gameState.turnStartHand]
  room.gameState.workingArea = []

  await setRoom(room)

  return { success: true }
}

export async function endGame(roomCode: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, error: "Room not found" }

  // Reset game state to lobby
  room.gameState.phase = "lobby"
  room.gameState.melds = []
  room.gameState.tilePool = []
  room.gameState.currentPlayerIndex = 0
  room.gameState.winner = null
  room.gameState.turnStartMelds = []
  room.gameState.turnStartHand = []
  room.gameState.workingArea = []

  // Reset all players
  room.gameState.players = room.gameState.players.map((p) => ({
    ...p,
    hand: [],
    hasInitialMeld: false,
  }))

  await setRoom(room)

  return { success: true }
}

export async function leaveRoom(roomCode: string, playerId: string): Promise<void> {
  const room = await getRoom(roomCode)
  if (!room) return

  const player = room.gameState.players.find((p) => p.id === playerId)
  if (player) {
    player.isConnected = false
  }

  const connectedPlayers = room.gameState.players.filter((p) => p.isConnected)
  if (connectedPlayers.length === 0) {
    await redis.del(roomKey(roomCode))
  } else {
    await setRoom(room)
  }
}

export async function getPlayerByCode(
  roomCode: string,
  playerCode: string,
): Promise<{ success: boolean; playerName?: string; error?: string }> {
  const code = roomCode.toUpperCase()
  const room = await getRoom(code)

  if (!room) {
    return { success: false, error: "Room not found" }
  }

  const player = room.gameState.players.find((p) => p.playerCode === playerCode.toUpperCase())
  if (!player) {
    return { success: false, error: "Invalid player code" }
  }

  return { success: true, playerName: player.name }
}

export async function changeRoomStyle(
  roomCode: string,
  playerId: string,
  styleId: RoomStyleId,
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, error: "Room not found" }

  const player = room.gameState.players.find((p) => p.id === playerId)
  if (!player?.isHost) {
    return { success: false, error: "Only the host can change the room style" }
  }

  room.roomStyleId = styleId
  await setRoom(room)

  return { success: true }
}
