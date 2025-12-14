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
  computeBoardSignature,
  formatTile,
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
    lastSeenMeldTileIds: [],
    queuedTurn: null,
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
      revision: 0,
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
    lastSeenMeldTileIds: [],
    queuedTurn: null,
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
): Promise<{
  success: boolean
  gameState?: GameState
  error?: string
  playersForEmail?: { email: string; name: string; playerCode: string }[]
  roomStyleId?: RoomStyleId
}> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, error: "Room not found" }

  const player = room.gameState.players.find((p) => p.id === playerId)
  if (!player?.isHost) {
    return { success: false, error: "Only the host can start the game" }
  }

  if (room.gameState.players.length < MIN_PLAYERS) {
    return { success: false, error: `Need at least ${MIN_PLAYERS} players to start` }
  }

  const playersForEmail = room.gameState.players
    .filter((p) => p.email && p.playerCode)
    .map((p) => ({
      email: p.email!,
      name: p.name,
      playerCode: p.playerCode!,
    }))

  const playerData = room.gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    playerCode: p.playerCode,
    email: p.email,
    hasInitialMeld: false,
    lastSeenMeldTileIds: [],
  }))

  const rules = getRulesForPlayerCount(playerData.length)
  room.gameState = initializeGame(playerData, rules)

  room.gameState.revision = 0

  const currentPlayer = room.gameState.players[0]
  room.gameState.turnStartHand = [...currentPlayer.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))

  await setRoom(room)

  return {
    success: true,
    gameState: room.gameState,
    playersForEmail,
    roomStyleId: room.roomStyleId,
  }
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
  room.gameState.revision++
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
  roomStyleId?: RoomStyleId
  autoPlayedPlayers?: { name: string; email?: string; playerCode?: string; melds: Meld[] }[]
  failedPlayers?: {
    name: string
    email?: string
    playerCode?: string
    reason: string
    boardChanges: { added: string[]; removed: string[] }
    queuedAt: number
    baseRevision: number
  }[]
}> {
  const room = await getRoom(roomCode)
  if (!room || room.gameState.phase !== "playing") {
    return { success: false, error: "Game not in progress" }
  }

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Not your turn" }
  }

  room.gameState.melds = JSON.parse(JSON.stringify(room.gameState.turnStartMelds))
  currentPlayer.hand = [...room.gameState.turnStartHand]
  room.gameState.workingArea = []

  const tile = drawTile(room.gameState)
  if (tile) {
    currentPlayer.hand.push(tile)
  }

  const currentMeldTileIds: string[] = []
  room.gameState.melds.forEach((meld) => {
    meld.tiles.forEach((t) => currentMeldTileIds.push(t.id))
  })
  currentPlayer.lastSeenMeldTileIds = currentMeldTileIds

  room.gameState.revision++

  room.gameState.currentPlayerIndex = nextPlayer(room.gameState)

  const { autoPlayedPlayers, failedPlayers } = await tryAutoPlayQueuedTurns(room)

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
    drawnTile: tile || undefined,
    nextPlayer: {
      name: nextPlayerObj.name,
      email: nextPlayerObj.email,
      playerCode: nextPlayerObj.playerCode,
    },
    playerStandings,
    roomStyleId: room.roomStyleId,
    autoPlayedPlayers,
    failedPlayers,
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
  roomStyleId?: RoomStyleId
  autoPlayedPlayers?: { name: string; email?: string; playerCode?: string; melds: Meld[] }[]
  failedPlayers?: {
    name: string
    email?: string
    playerCode?: string
    reason: string
    boardChanges: { added: string[]; removed: string[] }
    queuedAt: number
    baseRevision: number
    currentRevision: number
  }[]
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

  const currentMeldTileIds: string[] = []
  room.gameState.melds.forEach((meld) => {
    meld.tiles.forEach((t) => currentMeldTileIds.push(t.id))
  })
  currentPlayer.lastSeenMeldTileIds = currentMeldTileIds

  room.gameState.revision++

  const endCheck = checkGameEnd(room.gameState)
  if (endCheck.ended) {
    room.gameState.phase = "ended"
    room.gameState.winner = endCheck.winner || null
    await setRoom(room)
    return { success: true, gameEnded: true, winner: endCheck.winner }
  }

  room.gameState.currentPlayerIndex = nextPlayer(room.gameState)

  const { autoPlayedPlayers, failedPlayers } = await tryAutoPlayQueuedTurns(room)

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
    roomStyleId: room.roomStyleId,
    autoPlayedPlayers,
    failedPlayers,
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

  room.gameState.melds = JSON.parse(JSON.stringify(room.gameState.turnStartMelds))
  currentPlayer.hand = [...room.gameState.turnStartHand]
  room.gameState.workingArea = []

  room.gameState.revision++

  await setRoom(room)

  return { success: true }
}

export async function endGame(roomCode: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, error: "Room not found" }

  room.gameState.phase = "lobby"
  room.gameState.melds = []
  room.gameState.tilePool = []
  room.gameState.currentPlayerIndex = 0
  room.gameState.winner = null
  room.gameState.turnStartMelds = []
  room.gameState.turnStartHand = []
  room.gameState.workingArea = []

  room.gameState.players = room.gameState.players.map((p) => ({
    ...p,
    hand: [],
    hasInitialMeld: false,
    lastSeenMeldTileIds: [],
  }))

  room.gameState.revision++

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

export async function bootPlayer(
  roomCode: string,
  requestingPlayerId: string,
  targetPlayerId: string,
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, error: "Room not found" }

  if (room.gameState.phase !== "lobby") {
    return { success: false, error: "Can only boot players in lobby" }
  }

  const requestingPlayer = room.gameState.players.find((p) => p.id === requestingPlayerId)
  if (!requestingPlayer) {
    return { success: false, error: "You are not in this room" }
  }

  const targetIndex = room.gameState.players.findIndex((p) => p.id === targetPlayerId)
  if (targetIndex === -1) {
    return { success: false, error: "Player not found" }
  }

  const targetPlayer = room.gameState.players[targetIndex]

  if (targetPlayerId === requestingPlayerId) {
    return { success: false, error: "Cannot boot yourself" }
  }

  room.gameState.players.splice(targetIndex, 1)

  if (targetPlayer.isHost && room.gameState.players.length > 0) {
    room.gameState.players[0].isHost = true
  }

  await setRoom(room)

  return { success: true }
}

export async function queueTurn(
  roomCode: string,
  playerId: string,
  plannedMelds: Meld[],
  plannedHand: Tile[],
  plannedWorkingArea: Tile[],
): Promise<{ success: boolean; error?: string }> {
  console.log("[v0] Queue turn request:", {
    roomCode,
    playerId: playerId.slice(0, 8),
    meldsCount: plannedMelds.length,
    handSize: plannedHand.length,
    workingAreaSize: plannedWorkingArea.length,
  })

  const room = await getRoom(roomCode)
  if (!room || room.gameState.phase !== "playing") {
    console.log("[v0] Queue turn failed: Game not in progress")
    return { success: false, error: "Game not in progress" }
  }

  const player = room.gameState.players.find((p) => p.id === playerId)
  if (!player) {
    console.log("[v0] Queue turn failed: Player not found")
    return { success: false, error: "Player not found" }
  }

  if (room.gameState.players[room.gameState.currentPlayerIndex].id === playerId) {
    console.log("[v0] Queue turn failed: Cannot queue on your own turn")
    return { success: false, error: "Cannot queue turn when it's your turn" }
  }

  const baseBoardSignature = computeBoardSignature(room.gameState.melds)

  console.log("[v0] Creating queued turn:", {
    baseRevision: room.gameState.revision,
    baseBoardSignature: baseBoardSignature.slice(0, 50) + "...",
  })

  player.queuedTurn = {
    id: generateId(),
    queuedAt: Date.now(),
    baseRevision: room.gameState.revision,
    baseBoardSignature,
    plannedMelds,
    plannedHand,
    plannedWorkingArea,
  }

  await setRoom(room)
  console.log("[v0] Turn queued successfully")
  return { success: true }
}

export async function clearQueuedTurn(
  roomCode: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomCode)
  if (!room) {
    return { success: false, error: "Room not found" }
  }

  const player = room.gameState.players.find((p) => p.id === playerId)
  if (!player) {
    return { success: false, error: "Player not found" }
  }

  player.queuedTurn = null
  await setRoom(room)
  return { success: true }
}

async function tryAutoPlayQueuedTurns(room: Room): Promise<{
  autoPlayedPlayers: { name: string; email?: string; playerCode?: string; melds: Meld[] }[]
  failedPlayers: {
    name: string
    email?: string
    playerCode?: string
    reason: string
    boardChanges: { added: string[]; removed: string[] }
    queuedAt: number
    baseRevision: number
    currentRevision: number
  }[]
}> {
  const autoPlayedPlayers: { name: string; email?: string; playerCode?: string; melds: Meld[] }[] = []
  const failedPlayers: {
    name: string
    email?: string
    playerCode?: string
    reason: string
    boardChanges: { added: string[]; removed: string[] }
    queuedAt: number
    baseRevision: number
    currentRevision: number
  }[] = []

  const maxAttempts = room.gameState.players.length
  let attempts = 0

  console.log("[v0] Starting auto-play attempt for queued turns")

  while (attempts < maxAttempts) {
    attempts++
    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]

    console.log("[v0] Checking player for queued turn:", {
      playerName: currentPlayer.name,
      hasQueuedTurn: !!currentPlayer.queuedTurn,
      attempt: attempts,
    })

    if (!currentPlayer.queuedTurn) {
      console.log("[v0] No queued turn found, stopping auto-play loop")
      break
    }

    const queuedTurn = currentPlayer.queuedTurn
    const currentBoardSignature = computeBoardSignature(room.gameState.melds)
    const boardChanged = queuedTurn.baseBoardSignature !== currentBoardSignature

    console.log("[v0] Validating queued turn:", {
      playerName: currentPlayer.name,
      boardChanged,
      baseRevision: queuedTurn.baseRevision,
      currentRevision: room.gameState.revision,
      queuedAt: new Date(queuedTurn.queuedAt).toISOString(),
    })

    const validation = canEndTurn(
      { ...currentPlayer, hand: queuedTurn.plannedHand },
      queuedTurn.plannedMelds,
      room.gameState.turnStartHand,
      room.gameState.turnStartMelds,
      queuedTurn.plannedWorkingArea,
      room.gameState.rules,
    )

    if (!validation.valid || boardChanged) {
      const reason = boardChanged ? "Board changed since turn was queued" : validation.reason || "Invalid queued state"

      console.log("[v0] Queued turn validation failed:", {
        playerName: currentPlayer.name,
        reason,
        boardChanged,
        validationReason: validation.reason,
      })

      const oldTileIds = new Set(queuedTurn.baseBoardSignature.split(",").filter((id) => id))
      const newTileIds = new Set(currentBoardSignature.split(",").filter((id) => id))

      const added: string[] = []
      const removed: string[] = []

      for (const id of newTileIds) {
        if (!oldTileIds.has(id)) {
          const tile = room.gameState.melds.flatMap((m) => m.tiles).find((t) => t.id === id)
          if (tile) added.push(formatTile(tile))
        }
      }

      for (const id of oldTileIds) {
        if (!newTileIds.has(id)) {
          const tile = queuedTurn.plannedMelds.flatMap((m) => m.tiles).find((t) => t.id === id)
          if (tile) removed.push(formatTile(tile))
        }
      }

      console.log("[v0] Board changes detected:", {
        added: added.length,
        removed: removed.length,
        addedTiles: added.slice(0, 3),
        removedTiles: removed.slice(0, 3),
      })

      failedPlayers.push({
        name: currentPlayer.name,
        email: currentPlayer.email,
        playerCode: currentPlayer.playerCode,
        reason,
        boardChanges: { added, removed },
        queuedAt: queuedTurn.queuedAt,
        baseRevision: queuedTurn.baseRevision,
        currentRevision: room.gameState.revision,
      })

      currentPlayer.queuedTurn = null
      await setRoom(room)
      console.log("[v0] Queued turn cleared due to validation failure")
      break
    }

    console.log("[v0] Queued turn validated successfully, applying:", {
      playerName: currentPlayer.name,
      meldsCount: queuedTurn.plannedMelds.length,
      handSize: queuedTurn.plannedHand.length,
    })

    room.gameState.melds = queuedTurn.plannedMelds
    currentPlayer.hand = queuedTurn.plannedHand
    room.gameState.workingArea = queuedTurn.plannedWorkingArea

    if (!currentPlayer.hasInitialMeld) {
      currentPlayer.hasInitialMeld = true
    }

    const currentMeldTileIds: string[] = []
    room.gameState.melds.forEach((meld) => {
      meld.tiles.forEach((t) => currentMeldTileIds.push(t.id))
    })
    currentPlayer.lastSeenMeldTileIds = currentMeldTileIds

    room.gameState.revision++

    autoPlayedPlayers.push({
      name: currentPlayer.name,
      email: currentPlayer.email,
      playerCode: currentPlayer.playerCode,
      melds: queuedTurn.plannedMelds,
    })

    currentPlayer.queuedTurn = null

    console.log("[v0] Queued turn auto-played successfully:", {
      playerName: currentPlayer.name,
      newRevision: room.gameState.revision,
    })

    const endCheck = checkGameEnd(room.gameState)
    if (endCheck.ended) {
      console.log("[v0] Game ended after auto-play:", { winner: endCheck.winner })
      room.gameState.phase = "ended"
      room.gameState.winner = endCheck.winner || null
      break
    }

    room.gameState.currentPlayerIndex = nextPlayer(room.gameState)
    const nextPlayerObj = room.gameState.players[room.gameState.currentPlayerIndex]
    room.gameState.turnStartHand = [...nextPlayerObj.hand]
    room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))
    room.gameState.workingArea = []

    console.log("[v0] Advanced to next player:", {
      nextPlayerName: nextPlayerObj.name,
      hasQueuedTurn: !!nextPlayerObj.queuedTurn,
    })
  }

  console.log("[v0] Auto-play complete:", {
    autoPlayedCount: autoPlayedPlayers.length,
    failedCount: failedPlayers.length,
  })

  return { autoPlayedPlayers, failedPlayers }
}
