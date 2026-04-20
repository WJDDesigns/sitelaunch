import { createAdminClient } from "@/lib/supabase/admin";

interface ErrorContext {
  /** Error digest from Next.js (links server/client errors) */
  digest?: string;
  /** URL path where the error occurred */
  path?: string;
  /** Authenticated user ID if available */
  userId?: string;
  /** Any additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Capture an error to the error_logs table.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export function captureError(error: unknown, context: ErrorContext = {}) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const admin = createAdminClient();

    admin
      .from("error_logs")
      .insert({
        message: err.message,
        stack: err.stack ?? null,
        digest: context.digest ?? null,
        path: context.path ?? null,
        user_id: context.userId ?? null,
        metadata: context.metadata ?? {},
      })
      .then(() => {}, (dbErr) => {
        console.error("[error-tracking] DB insert failed:", dbErr);
      });

    // Always log to stdout for deployment platform logs (Vercel, etc.)
    console.error(`[error-tracking] ${err.message}`, {
      digest: context.digest,
      path: context.path,
      stack: err.stack,
    });
  } catch {
    // Last resort — never let error tracking itself throw
    console.error("[error-tracking] Failed to capture error:", error);
  }
}

/**
 * Client-safe error reporter — posts to /api/errors endpoint.
 * Use this from "use client" error boundaries.
 */
export async function reportErrorFromClient(error: {
  message: string;
  digest?: string;
  stack?: string;
}) {
  try {
    navigator.sendBeacon(
      "/api/errors",
      JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    );
  } catch {
    // Silently fail — analytics should never break the UI
  }
}
