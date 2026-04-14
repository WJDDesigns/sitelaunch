import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side code ONLY.
 * Bypasses RLS — never import this in a client component or expose it to the browser.
 * Use for anonymous submission flows where we validate a token before any DB access.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin env vars");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
