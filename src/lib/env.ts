/**
 * Environment variable validation.
 *
 * Import this module early (e.g. in middleware) so missing vars surface
 * immediately at startup rather than causing cryptic runtime errors.
 *
 * Only server-side variables are validated here. NEXT_PUBLIC_* vars are
 * inlined at build time by Next.js and will cause build failures if absent.
 */

const required = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "CLOUD_TOKEN_ENCRYPTION_KEY",
] as const;

type RequiredVar = (typeof required)[number];

let validated = false;

/**
 * Throws a descriptive error if any required server-side environment
 * variables are missing. Safe to call multiple times — only runs once.
 */
export function validateEnv(): void {
  if (validated) return;

  const missing: string[] = [];
  for (const name of required) {
    if (!process.env[name]) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n  - ${missing.join("\n  - ")}\n\nAdd them to your .env.local or hosting provider.`,
    );
  }

  validated = true;
}

/* ── Typed exports for convenience ─────────────────────────── */

/** Supabase service-role key (full admin access). */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Stripe secret API key. */
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

/** Stripe webhook signing secret. */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

/** Resend email API key. */
export const RESEND_API_KEY = process.env.RESEND_API_KEY!;

/** Symmetric key used to encrypt cloud-provider OAuth tokens at rest. */
export const CLOUD_TOKEN_ENCRYPTION_KEY = process.env.CLOUD_TOKEN_ENCRYPTION_KEY!;
