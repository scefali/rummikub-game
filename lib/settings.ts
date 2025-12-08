"use client"

export interface GameSettings {
  soundEnabled: boolean
  soundVolume: number // 0-1
}

const SETTINGS_KEY = "rummikub_settings"

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
}

export function getSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS

  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: Partial<GameSettings>): GameSettings {
  const current = getSettings()
  const updated = { ...current, ...settings }

  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  }

  return updated
}

// Audio context for playing sounds
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null

  if (!audioContext) {
    try {
      audioContext = new (
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    } catch {
      return null
    }
  }
  return audioContext
}

export function playTurnSound(): void {
  const settings = getSettings()
  if (!settings.soundEnabled) return

  const ctx = getAudioContext()
  if (!ctx) return

  // Resume audio context if suspended (required for autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume()
  }

  // Create a pleasant notification sound using Web Audio API
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  // Set volume
  const volume = settings.soundVolume * 0.3 // Scale down for comfortable listening

  // Play two notes for a pleasant "ding-dong" effect
  const now = ctx.currentTime

  // First note (higher)
  oscillator.frequency.setValueAtTime(880, now) // A5
  oscillator.frequency.setValueAtTime(660, now + 0.15) // E5

  // Envelope
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.02)
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.15)
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.17)
  gainNode.gain.linearRampToValueAtTime(0, now + 0.4)

  oscillator.start(now)
  oscillator.stop(now + 0.4)
}

// Test sound function for settings UI
export function playTestSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === "suspended") {
    ctx.resume()
  }

  const settings = getSettings()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  const volume = settings.soundVolume * 0.3
  const now = ctx.currentTime

  oscillator.frequency.setValueAtTime(880, now)
  oscillator.frequency.setValueAtTime(660, now + 0.15)

  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.02)
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.15)
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.17)
  gainNode.gain.linearRampToValueAtTime(0, now + 0.4)

  oscillator.start(now)
  oscillator.stop(now + 0.4)
}
