"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
    console.error("[v0] Global error boundary caught:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground mt-2">The error has been reported and we'll look into it.</p>
        {error.message && <p className="text-sm text-muted-foreground mt-2 font-mono">{error.message}</p>}
      </div>
      <Button onClick={reset}>Try again</Button>
      <Button variant="outline" onClick={() => (window.location.href = "/")}>
        Go home
      </Button>
    </div>
  )
}
