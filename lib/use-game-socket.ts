"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { GameState, Meld, Tile } from "./game-types"

interface UseGameSocketOptions {
  onError?: (message: string) => void
}

interface GameSocketState {
  isConnected: boolean
  roomCode: string | null
  playerId: string | null
  gameState: GameState | null
  error: string | null
}

export function useGameSocket(options: UseGameSocketOptions = {}) {
  const [state, setState] = useState<GameSocketState>({
    isConnected: false,
    roomCode: null,
    playerId: null,
    gameState: null,
    error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/socket`)

    ws.onopen = () => {
      console.log("[v0] WebSocket connected")
      setState((prev) => ({ ...prev, isConnected: true, error: null }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch {
        console.error("[v0] Failed to parse message")
      }
    }

    ws.onclose = () => {
      console.log("[v0] WebSocket disconnected")
      setState((prev) => ({ ...prev, isConnected: false }))

      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (state.roomCode) {
          connect()
        }
      }, 2000)
    }

    ws.onerror = () => {
      setState((prev) => ({ ...prev, error: "Connection error" }))
    }

    wsRef.current = ws
  }, [state.roomCode])

  const handleMessage = useCallback(
    (message: { type: string; payload?: Record<string, unknown> }) => {
      switch (message.type) {
        case "room_created":
        case "room_joined":
          setState((prev) => ({
            ...prev,
            roomCode: message.payload?.roomCode as string,
            playerId: message.payload?.playerId as string,
            gameState: message.payload?.gameState as GameState,
          }))
          break

        case "player_joined":
        case "player_left":
        case "game_started":
        case "game_state_update":
          setState((prev) => ({
            ...prev,
            gameState: message.payload?.gameState as GameState,
          }))
          break

        case "game_ended":
          setState((prev) => ({
            ...prev,
            gameState: message.payload?.gameState as GameState,
          }))
          break

        case "room_not_found":
          setState((prev) => ({
            ...prev,
            error: "Room not found",
          }))
          options.onError?.("Room not found")
          break

        case "error":
          const errorMsg = (message.payload?.message as string) || "Unknown error"
          setState((prev) => ({ ...prev, error: errorMsg }))
          options.onError?.(errorMsg)
          break
      }
    },
    [options],
  )

  const sendMessage = useCallback((type: string, payload?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const createRoom = useCallback(
    (playerName: string) => {
      connect()
      // Wait for connection before sending
      const checkAndSend = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendMessage("create_room", { playerName })
        } else {
          setTimeout(checkAndSend, 100)
        }
      }
      checkAndSend()
    },
    [connect, sendMessage],
  )

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      connect()
      const checkAndSend = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendMessage("join_room", { roomCode, playerName })
        } else {
          setTimeout(checkAndSend, 100)
        }
      }
      checkAndSend()
    },
    [connect, sendMessage],
  )

  const startGame = useCallback(() => {
    sendMessage("start_game")
  }, [sendMessage])

  const playTiles = useCallback(
    (melds: Meld[], hand: Tile[]) => {
      sendMessage("play_tiles", { melds, hand })
    },
    [sendMessage],
  )

  const drawTile = useCallback(() => {
    sendMessage("draw_tile")
  }, [sendMessage])

  const endTurn = useCallback(() => {
    sendMessage("end_turn")
  }, [sendMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
    setState({
      isConnected: false,
      roomCode: null,
      playerId: null,
      gameState: null,
      error: null,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [])

  return {
    ...state,
    createRoom,
    joinRoom,
    startGame,
    playTiles,
    drawTile,
    endTurn,
    disconnect,
  }
}
