import { type NextRequest, NextResponse } from "next/server"
import * as gameStore from "@/lib/game-store"
import {
  sendTurnNotificationEmail,
  sendGameLinkEmail,
  sendQueuedTurnAutoplayedEmail,
  sendQueuedTurnFailedEmail,
} from "@/lib/email"
import type { RoomStyleId, Meld, Tile } from "@/lib/game-types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      action,
      roomCode,
      playerId,
      playerName,
      playerEmail,
      playerCode,
      melds,
      hand,
      workingArea,
      styleId,
      targetPlayerId,
      plannedMelds,
      plannedHand,
      plannedWorkingArea,
    } = body

    console.log("[v0] API Request:", {
      action,
      roomCode,
      playerName,
      playerId: playerId ? playerId.slice(0, 8) : "undefined",
    })

    switch (action) {
      case "create_room": {
        const result = await gameStore.createRoom(playerName, playerEmail)
        console.log("[v0] Room created:", {
          roomCode: result.roomCode,
          playerId: result.playerId ? result.playerId.slice(0, 8) : "undefined",
        })
        return NextResponse.json({
          roomCode: result.roomCode,
          playerId: result.playerId,
          playerCode: result.playerCode,
          gameState: result.gameState,
          roomStyleId: result.roomStyleId,
        })
      }

      case "join_room": {
        console.log("[v0] Attempting to join room:", roomCode)
        const result = await gameStore.joinRoom(roomCode, playerName, playerEmail)
        console.log("[v0] Join result:", { success: result.success, error: result.error })
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          playerId: result.playerId,
          playerCode: result.playerCode,
          gameState: result.gameState,
          roomStyleId: result.roomStyleId,
        })
      }

      case "login_with_code": {
        console.log("[v0] Attempting login with code:", roomCode, playerCode)
        const result = await gameStore.loginWithCode(roomCode, playerCode)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          playerId: result.playerId,
          playerName: result.playerName,
        })
      }

      case "get_state": {
        const result = await gameStore.getGameState(roomCode, playerId)
        if (!result) {
          console.log("[v0] Room not found for get_state:", roomCode)
          return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }
        return NextResponse.json({ gameState: result.gameState, roomStyleId: result.roomStyleId })
      }

      case "start_game": {
        const result = await gameStore.startGame(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        if (result.playersForEmail && result.playersForEmail.length > 0) {
          const allPlayerNames = result.playersForEmail.map((p) => p.name)
          const gameStartedAt = new Date().toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })

          for (const player of result.playersForEmail) {
            sendGameLinkEmail(
              player.email,
              player.name,
              roomCode,
              player.playerCode,
              result.roomStyleId,
              allPlayerNames,
              gameStartedAt,
            ).catch((err) => console.error("[v0] Game link email send failed:", err))
          }
        }

        return NextResponse.json({ success: true })
      }

      case "play_tiles": {
        const result = await gameStore.playTiles(roomCode, playerId, melds, hand, workingArea || [])
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

        if (result.autoPlayedPlayers) {
          for (const player of result.autoPlayedPlayers) {
            if (player.email && player.playerCode) {
              sendQueuedTurnAutoplayedEmail(
                player.email,
                player.name,
                roomCode,
                player.playerCode,
                player.melds,
                result.roomStyleId,
              ).catch((err) => console.error("[v0] Auto-play email send failed:", err))
            }
          }
        }

        if (result.failedPlayers) {
          for (const player of result.failedPlayers) {
            if (player.email && player.playerCode) {
              sendQueuedTurnFailedEmail(
                player.email,
                player.name,
                roomCode,
                player.playerCode,
                player.reason,
                player.boardChanges,
                player.queuedAt,
                player.baseRevision,
                result.roomStyleId,
              ).catch((err) => console.error("[v0] Failed turn email send failed:", err))
            }
          }
        }

        // Only send "it's your turn" if no queued turn was auto-played or failed for this player
        const nextPlayerEmailSent =
          result.autoPlayedPlayers?.some((p) => p.email === result.nextPlayer?.email) ||
          result.failedPlayers?.some((p) => p.email === result.nextPlayer?.email)

        if (!nextPlayerEmailSent && result.nextPlayer?.email && result.nextPlayer?.playerCode) {
          sendTurnNotificationEmail(
            result.nextPlayer.email,
            result.nextPlayer.name,
            roomCode,
            result.nextPlayer.playerCode,
            result.playerStandings,
            result.roomStyleId,
          ).catch((err) => console.error("[v0] Email send failed:", err))
        }

        return NextResponse.json({ success: true, drawnTile: result.drawnTile })
      }

      case "end_turn": {
        const result = await gameStore.handleEndTurn(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        if (result.autoPlayedPlayers) {
          for (const player of result.autoPlayedPlayers) {
            if (player.email && player.playerCode) {
              sendQueuedTurnAutoplayedEmail(
                player.email,
                player.name,
                roomCode,
                player.playerCode,
                player.melds,
                result.roomStyleId,
              ).catch((err) => console.error("[v0] Auto-play email send failed:", err))
            }
          }
        }

        if (result.failedPlayers) {
          for (const player of result.failedPlayers) {
            if (player.email && player.playerCode) {
              sendQueuedTurnFailedEmail(
                player.email,
                player.name,
                roomCode,
                player.playerCode,
                player.reason,
                player.boardChanges,
                player.queuedAt,
                player.baseRevision,
                result.roomStyleId,
              ).catch((err) => console.error("[v0] Failed turn email send failed:", err))
            }
          }
        }

        // Only send "it's your turn" if no queued turn was auto-played or failed for this player
        const nextPlayerEmailSent =
          result.autoPlayedPlayers?.some((p) => p.email === result.nextPlayer?.email) ||
          result.failedPlayers?.some((p) => p.email === result.nextPlayer?.email)

        if (!nextPlayerEmailSent && result.nextPlayer?.email && result.nextPlayer?.playerCode) {
          sendTurnNotificationEmail(
            result.nextPlayer.email,
            result.nextPlayer.name,
            roomCode,
            result.nextPlayer.playerCode,
            result.playerStandings,
            result.roomStyleId,
          ).catch((err) => console.error("[v0] Email send failed:", err))
        }

        return NextResponse.json({ success: true, gameEnded: result.gameEnded, winner: result.winner })
      }

      case "reset_turn": {
        const result = await gameStore.resetTurn(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "end_game": {
        const result = await gameStore.endGame(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "leave": {
        await gameStore.leaveRoom(roomCode, playerId)
        return NextResponse.json({ success: true })
      }

      case "change_room_style": {
        const result = await gameStore.changeRoomStyle(roomCode, playerId, styleId as RoomStyleId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "boot_player": {
        const result = await gameStore.bootPlayer(roomCode, playerId, targetPlayerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "queue_turn": {
        const result = await gameStore.queueTurn(
          roomCode,
          playerId,
          plannedMelds as Meld[],
          plannedHand as Tile[],
          plannedWorkingArea as Tile[],
        )
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case "clear_queued_turn": {
        const result = await gameStore.clearQueuedTurn(roomCode, playerId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (err) {
    console.log("[v0] API Error:", err)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
