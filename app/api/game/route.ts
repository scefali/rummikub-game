import { type NextRequest, NextResponse } from "next/server"
import * as gameStore from "@/lib/game-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, roomCode, playerId, playerName, melds, hand } = body

    switch (action) {
      case "create_room": {
        const result = await gameStore.createRoom(playerName)
        return NextResponse.json(result)
      }

      case "join_room": {
        const result = await gameStore.joinRoom(roomCode, playerName)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json(result)
      }

      case "get_state": {
        const gameState = await gameStore.getGameState(roomCode, playerId)
        if (!gameState) {
          return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }
        return NextResponse.json({ gameState })
      }

      case "start_game": {
        const result = await gameStore.startGame(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "play_tiles": {
        const result = await gameStore.playTiles(roomCode, playerId, melds, hand)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "draw_tile": {
        const result = await gameStore.handleDrawTile(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "end_turn": {
        const result = await gameStore.handleEndTurn(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true, gameEnded: result.gameEnded, winner: result.winner })
      }

      case "leave": {
        await gameStore.leaveRoom(roomCode, playerId)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
