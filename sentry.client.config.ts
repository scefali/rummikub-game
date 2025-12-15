import * as Sentry from "@sentry/nextjs"

const DSN = "https://3a70e62fdb6ab6214eb54e18f7f683a4@o4505059212656640.ingest.us.sentry.io/4510538196451328"

if (typeof window !== "undefined") {
  ;(window as any).SENTRY_DSN = DSN
}

Sentry.init({
  dsn: DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})

console.log("[v0] Sentry initialized on client with DSN:", DSN)
