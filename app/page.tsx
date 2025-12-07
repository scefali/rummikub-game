"use client"

import { useState, useEffect } from "react"
import { useGameSocket } from "@/lib/use-game-socket"
import { HomeScreen } from "@/components/home-screen"
import { LobbyScreen } from "@/components/lobby-screen"
import { GameBoard } from "@/components/game-board"
import { PlayerController } from "@/components/player-controller"
import { GameEndScreen } from "@/components/game-end-screen"
import { useIsMobile } from "@/hooks/use-mobile"

export default function GamePage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const {
    isConnected,
    roomCode,
    playerId,
    gameState,
    error,
    createRoom,
    joinRoom,
    startGame,
    playTiles,
    drawTile,
    endTurn,
    disconnect,
  } = useGameSocket({
    onError: (msg) => setErrorMessage(msg),
  })

  // Clear error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Clear error from socket
  useEffect(() => {
    if (error) {
      setErrorMessage(error)
    }
  }, [error])

  // Determine current view
  const currentPlayer = gameState?.players.find((p) => p.id === playerId)
  const isHost = currentPlayer?.isHost ?? false

  // No room - show home screen
  if (!roomCode || !gameState) {
    return <HomeScreen onCreateRoom={createRoom} onJoinRoom={joinRoom} error={errorMessage} />
  }

  // In lobby - show lobby screen
  if (gameState.phase === "lobby") {
    return (
      <LobbyScreen
        roomCode={roomCode}
        playerId={playerId!}
        gameState={gameState}
        onStartGame={startGame}
        onLeave={disconnect}
      />
    )
  }

  // Game ended - show end screen
  if (gameState.phase === "ended") {
    return (
      <GameEndScreen
        gameState={gameState}
        playerId={playerId!}
        onPlayAgain={() => {
          disconnect()
          window.location.reload()
        }}
      />
    )
  }

  // Game in progress - show game view
  // On mobile or for non-host players, show the player controller
  // On desktop for host, show both board and controller
  if (isMobile || !isHost) {
    return (
      <PlayerController
        gameState={gameState}
        playerId={playerId!}
        roomCode={roomCode}
        onPlayTiles={playTiles}
        onDrawTile={drawTile}
        onEndTurn={endTurn}
        error={errorMessage}
      />
    )
  }

  // Host on desktop - show main game board
  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId!}
      roomCode={roomCode}
      onPlayTiles={playTiles}
      onDrawTile={drawTile}
      onEndTurn={endTurn}
      error={errorMessage}
    />
  )
}
