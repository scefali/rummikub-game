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

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  // API call helper
  const apiCall = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Request failed")
        }
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed"
        options.onError?.(message)
        throw err
      }
    },
    [options],
  )

  // Poll for game state updates
  const pollGameState = useCallback(async () => {
    if (!state.roomCode || !state.playerId || isPollingRef.current) return

    isPollingRef.current = true
    try {
      const data = await apiCall({
        action: "get_state",
        roomCode: state.roomCode,
        playerId: state.playerId,
      })
      setState((prev) => ({
        ...prev,
        gameState: data.gameState,
        isConnected: true,
        error: null,
      }))
    } catch {
      // Silent fail for polling - will retry
    } finally {
      isPollingRef.current = false
    }
  }, [state.roomCode, state.playerId, apiCall])

  // Start polling when connected to a room
  useEffect(() => {
    if (state.roomCode && state.playerId) {
      // Initial fetch
      pollGameState()

      // Poll every 1 second
      pollingRef.current = setInterval(pollGameState, 1000)

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    }
  }, [state.roomCode, state.playerId, pollGameState])

  const createRoom = useCallback(
    async (playerName: string) => {
      try {
        const data = await apiCall({ action: "create_room", playerName })
        setState({
          isConnected: true,
          roomCode: data.roomCode,
          playerId: data.playerId,
          gameState: data.gameState,
          error: null,
        })
      } catch {
        // Error handled in apiCall
      }
    },
    [apiCall],
  )

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      try {
        const data = await apiCall({ action: "join_room", roomCode, playerName })
        setState({
          isConnected: true,
          roomCode: roomCode.toUpperCase(),
          playerId: data.playerId,
          gameState: data.gameState,
          error: null,
        })
      } catch {
        // Error handled in apiCall
      }
    },
    [apiCall],
  )

  const startGame = useCallback(async () => {
    if (!state.roomCode || !state.playerId) return
    try {
      await apiCall({
        action: "start_game",
        roomCode: state.roomCode,
        playerId: state.playerId,
      })
      // Poll will pick up the new state
    } catch {
      // Error handled in apiCall
    }
  }, [state.roomCode, state.playerId, apiCall])

  const playTiles = useCallback(
    async (melds: Meld[], hand: Tile[]) => {
      if (!state.roomCode || !state.playerId) return
      try {
        await apiCall({
          action: "play_tiles",
          roomCode: state.roomCode,
          playerId: state.playerId,
          melds,
          hand,
        })
        // Immediately poll for updated state
        pollGameState()
      } catch {
        // Error handled in apiCall
      }
    },
    [state.roomCode, state.playerId, apiCall, pollGameState],
  )

  const drawTile = useCallback(async () => {
    if (!state.roomCode || !state.playerId) return
    try {
      await apiCall({
        action: "draw_tile",
        roomCode: state.roomCode,
        playerId: state.playerId,
      })
      pollGameState()
    } catch {
      // Error handled in apiCall
    }
  }, [state.roomCode, state.playerId, apiCall, pollGameState])

  const endTurn = useCallback(async () => {
    if (!state.roomCode || !state.playerId) return
    try {
      await apiCall({
        action: "end_turn",
        roomCode: state.roomCode,
        playerId: state.playerId,
      })
      pollGameState()
    } catch {
      // Error handled in apiCall
    }
  }, [state.roomCode, state.playerId, apiCall, pollGameState])

  const disconnect = useCallback(async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (state.roomCode && state.playerId) {
      try {
        await apiCall({
          action: "leave",
          roomCode: state.roomCode,
          playerId: state.playerId,
        })
      } catch {
        // Ignore errors on disconnect
      }
    }

    setState({
      isConnected: false,
      roomCode: null,
      playerId: null,
      gameState: null,
      error: null,
    })
  }, [state.roomCode, state.playerId, apiCall])

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
