import type { Room, GameState, Player, Meld, Tile } from "@/lib/game-types"
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game-types"
import {
  generateRoomCode,
  generateId,
  initializeGame,
  drawTile,
  nextPlayer,
  checkGameEnd,
  canEndTurn,
} from "@/lib/game-logic"

// In-memory storage for rooms
const rooms = new Map<string, Room>()

// Map of WebSocket connections to room codes and player IDs
const connections = new Map<WebSocket, { roomCode: string; playerId: string }>()

// Map of room codes to WebSocket connections
const roomConnections = new Map<string, Set<WebSocket>>()

export function GET(request: Request) {
  const upgradeHeader = request.headers.get("Upgrade")
  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 })
  }

  const { socket: ws, response } =
    Reflect.get(globalThis, "Deno")?.upgradeWebSocket?.(request) ??
    (request as unknown as { socket: WebSocket; response: Response })

  if (!ws) {
    // Fallback for environments that don't support WebSocket upgrade directly
    return new Response("WebSocket not supported", { status: 500 })
  }

  ws.onopen = () => {
    console.log("[v0] WebSocket connected")
  }

  ws.onmessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data)
      handleMessage(ws, message)
    } catch {
      sendError(ws, "Invalid message format")
    }
  }

  ws.onclose = () => {
    handleDisconnect(ws)
  }

  return response
}

function sendMessage(ws: WebSocket, type: string, payload?: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }))
  }
}

function sendError(ws: WebSocket, message: string) {
  sendMessage(ws, "error", { message })
}

function broadcastToRoom(roomCode: string, type: string, payload?: unknown, excludeWs?: WebSocket) {
  const sockets = roomConnections.get(roomCode)
  if (sockets) {
    for (const ws of sockets) {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        sendMessage(ws, type, payload)
      }
    }
  }
}

function handleMessage(ws: WebSocket, message: { type: string; payload?: Record<string, unknown> }) {
  switch (message.type) {
    case "create_room":
      handleCreateRoom(ws, message.payload as { playerName: string })
      break
    case "join_room":
      handleJoinRoom(ws, message.payload as { roomCode: string; playerName: string })
      break
    case "start_game":
      handleStartGame(ws)
      break
    case "play_tiles":
      handlePlayTiles(ws, message.payload as { melds: Meld[]; hand: Tile[] })
      break
    case "draw_tile":
      handleDrawTile(ws)
      break
    case "end_turn":
      handleEndTurn(ws)
      break
    default:
      sendError(ws, "Unknown message type")
  }
}

function handleCreateRoom(ws: WebSocket, payload: { playerName: string }) {
  const roomCode = generateRoomCode()
  const playerId = generateId()

  const player: Player = {
    id: playerId,
    name: payload.playerName,
    isHost: true,
    hand: [],
    hasInitialMeld: false,
    isConnected: true,
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
    },
    createdAt: Date.now(),
  }

  rooms.set(roomCode, room)
  connections.set(ws, { roomCode, playerId })

  if (!roomConnections.has(roomCode)) {
    roomConnections.set(roomCode, new Set())
  }
  roomConnections.get(roomCode)!.add(ws)

  sendMessage(ws, "room_created", {
    roomCode,
    playerId,
    gameState: room.gameState,
  })
}

function handleJoinRoom(ws: WebSocket, payload: { roomCode: string; playerName: string }) {
  const roomCode = payload.roomCode.toUpperCase()
  const room = rooms.get(roomCode)

  if (!room) {
    sendMessage(ws, "room_not_found", { message: "Room not found" })
    return
  }

  if (room.gameState.phase !== "lobby") {
    sendError(ws, "Game already in progress")
    return
  }

  if (room.gameState.players.length >= MAX_PLAYERS) {
    sendError(ws, "Room is full")
    return
  }

  const playerId = generateId()
  const player: Player = {
    id: playerId,
    name: payload.playerName,
    isHost: false,
    hand: [],
    hasInitialMeld: false,
    isConnected: true,
  }

  room.gameState.players.push(player)
  connections.set(ws, { roomCode, playerId })

  if (!roomConnections.has(roomCode)) {
    roomConnections.set(roomCode, new Set())
  }
  roomConnections.get(roomCode)!.add(ws)

  // Send to the joining player
  sendMessage(ws, "room_joined", {
    roomCode,
    playerId,
    gameState: room.gameState,
  })

  // Broadcast to others in the room
  broadcastToRoom(
    roomCode,
    "player_joined",
    {
      player,
      gameState: room.gameState,
    },
    ws,
  )
}

function handleStartGame(ws: WebSocket) {
  const connection = connections.get(ws)
  if (!connection) return

  const room = rooms.get(connection.roomCode)
  if (!room) return

  const player = room.gameState.players.find((p) => p.id === connection.playerId)
  if (!player?.isHost) {
    sendError(ws, "Only the host can start the game")
    return
  }

  if (room.gameState.players.length < MIN_PLAYERS) {
    sendError(ws, `Need at least ${MIN_PLAYERS} players to start`)
    return
  }

  // Initialize the game
  const playerData = room.gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
  }))

  room.gameState = initializeGame(playerData)

  // Save turn start state for first player
  const currentPlayer = room.gameState.players[0]
  room.gameState.turnStartHand = [...currentPlayer.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))

  // Send personalized game state to each player (only their own hand)
  const sockets = roomConnections.get(connection.roomCode)
  if (sockets) {
    for (const socket of sockets) {
      const conn = connections.get(socket)
      if (conn) {
        const playerState = getPlayerGameState(room.gameState, conn.playerId)
        sendMessage(socket, "game_started", { gameState: playerState })
      }
    }
  }
}

function handlePlayTiles(ws: WebSocket, payload: { melds: Meld[]; hand: Tile[] }) {
  const connection = connections.get(ws)
  if (!connection) return

  const room = rooms.get(connection.roomCode)
  if (!room || room.gameState.phase !== "playing") return

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== connection.playerId) {
    sendError(ws, "Not your turn")
    return
  }

  // Update game state with new melds and hand
  room.gameState.melds = payload.melds
  currentPlayer.hand = payload.hand

  // Broadcast updated state to all players
  broadcastGameState(connection.roomCode)
}

function handleDrawTile(ws: WebSocket) {
  const connection = connections.get(ws)
  if (!connection) return

  const room = rooms.get(connection.roomCode)
  if (!room || room.gameState.phase !== "playing") return

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== connection.playerId) {
    sendError(ws, "Not your turn")
    return
  }

  // Revert any changes made during the turn
  room.gameState.melds = JSON.parse(JSON.stringify(room.gameState.turnStartMelds))
  currentPlayer.hand = [...room.gameState.turnStartHand]

  const tile = drawTile(room.gameState)
  if (tile) {
    currentPlayer.hand.push(tile)
  }

  // Move to next player
  room.gameState.currentPlayerIndex = nextPlayer(room.gameState)
  const nextPlayerObj = room.gameState.players[room.gameState.currentPlayerIndex]
  room.gameState.turnStartHand = [...nextPlayerObj.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))

  broadcastGameState(connection.roomCode)
}

function handleEndTurn(ws: WebSocket) {
  const connection = connections.get(ws)
  if (!connection) return

  const room = rooms.get(connection.roomCode)
  if (!room || room.gameState.phase !== "playing") return

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
  if (currentPlayer.id !== connection.playerId) {
    sendError(ws, "Not your turn")
    return
  }

  // Validate turn
  const validation = canEndTurn(
    currentPlayer,
    room.gameState.melds,
    room.gameState.turnStartHand,
    room.gameState.turnStartMelds,
  )

  if (!validation.valid) {
    sendError(ws, validation.reason || "Invalid turn")
    return
  }

  // Mark initial meld as complete if applicable
  if (!currentPlayer.hasInitialMeld) {
    currentPlayer.hasInitialMeld = true
  }

  // Check for game end
  const endCheck = checkGameEnd(room.gameState)
  if (endCheck.ended) {
    room.gameState.phase = "ended"
    room.gameState.winner = endCheck.winner || null

    broadcastToRoom(connection.roomCode, "game_ended", {
      winner: endCheck.winner,
      gameState: room.gameState,
    })
    return
  }

  // Move to next player
  room.gameState.currentPlayerIndex = nextPlayer(room.gameState)
  const nextPlayerObj = room.gameState.players[room.gameState.currentPlayerIndex]
  room.gameState.turnStartHand = [...nextPlayerObj.hand]
  room.gameState.turnStartMelds = JSON.parse(JSON.stringify(room.gameState.melds))

  broadcastGameState(connection.roomCode)
}

function handleDisconnect(ws: WebSocket) {
  const connection = connections.get(ws)
  if (!connection) return

  const room = rooms.get(connection.roomCode)
  if (room) {
    const player = room.gameState.players.find((p) => p.id === connection.playerId)
    if (player) {
      player.isConnected = false
    }

    broadcastToRoom(connection.roomCode, "player_left", {
      playerId: connection.playerId,
      gameState: room.gameState,
    })

    // Clean up room if empty
    const connectedPlayers = room.gameState.players.filter((p) => p.isConnected)
    if (connectedPlayers.length === 0) {
      rooms.delete(connection.roomCode)
      roomConnections.delete(connection.roomCode)
    }
  }

  const roomSockets = roomConnections.get(connection.roomCode)
  if (roomSockets) {
    roomSockets.delete(ws)
  }

  connections.delete(ws)
}

function getPlayerGameState(gameState: GameState, playerId: string): GameState {
  // Return game state with only the requesting player's hand visible
  return {
    ...gameState,
    players: gameState.players.map((p) => ({
      ...p,
      hand: p.id === playerId ? p.hand : [], // Hide other players' hands
      handCount: p.hand.length, // Send hand count for display
    })) as Player[],
  }
}

function broadcastGameState(roomCode: string) {
  const room = rooms.get(roomCode)
  if (!room) return

  const sockets = roomConnections.get(roomCode)
  if (sockets) {
    for (const socket of sockets) {
      const conn = connections.get(socket)
      if (conn) {
        const playerState = getPlayerGameState(room.gameState, conn.playerId)
        sendMessage(socket, "game_state_update", { gameState: playerState })
      }
    }
  }
}
