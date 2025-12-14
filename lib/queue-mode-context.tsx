"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface QueueModeContextValue {
  queueMode: boolean
  setQueueMode: (enabled: boolean) => void
  toggleQueueMode: (enabled: boolean) => void
  exitQueueMode: () => void
}

const QueueModeContext = createContext<QueueModeContextValue | undefined>(undefined)

export function QueueModeProvider({ children }: { children: ReactNode }) {
  const [queueMode, setQueueMode] = useState(false)

  const toggleQueueMode = useCallback((enabled: boolean) => {
    setQueueMode(enabled)
  }, [])

  const exitQueueMode = useCallback(() => {
    setQueueMode(false)
  }, [])

  return (
    <QueueModeContext.Provider
      value={{
        queueMode,
        setQueueMode,
        toggleQueueMode,
        exitQueueMode,
      }}
    >
      {children}
    </QueueModeContext.Provider>
  )
}

export function useQueueMode() {
  const context = useContext(QueueModeContext)
  if (context === undefined) {
    throw new Error("useQueueMode must be used within a QueueModeProvider")
  }
  return context
}
