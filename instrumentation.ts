export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs")
    Sentry.init({
      dsn: "https://3a70e62fdb6ab6214eb54e18f7f683a4@o4505059212656640.ingest.us.sentry.io/4510538196451328",
      tracesSampleRate: 1.0,
      debug: false,
    })
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs")
    Sentry.init({
      dsn: "https://3a70e62fdb6ab6214eb54e18f7f683a4@o4505059212656640.ingest.us.sentry.io/4510538196451328",
      tracesSampleRate: 1.0,
      debug: false,
    })
  }
}

let Sentry: any

export const onRequestError = async (
  err: Error,
  request: { path: string; method: string },
  context: {
    routerKind: "Pages Router" | "App Router"
    routePath: string
    routeType: "render" | "route" | "action" | "middleware"
  },
) => {
  console.error("[v0] Request error:", err)
  console.error("[v0] Request path:", request.path)
  console.error("[v0] Route context:", context)

  if (typeof window === "undefined") {
    Sentry = await import("@sentry/nextjs")
    Sentry.captureException(err, {
      extra: {
        requestPath: request.path,
        requestMethod: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
      },
    })
  }
}
