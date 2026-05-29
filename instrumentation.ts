export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next.js hook for capturing route handler / server component errors.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
