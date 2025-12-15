export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

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
}
