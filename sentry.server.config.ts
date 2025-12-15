import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://3a70e62fdb6ab6214eb54e18f7f683a4@o4505059212656640.ingest.us.sentry.io/4510538196451328",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
})
