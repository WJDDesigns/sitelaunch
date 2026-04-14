import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "superadmin" | "partner_owner" | "partner_member" | "client";

export interface SessionContext {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
}

/**
 * Returns the current session (user + profile) or null if not signed in.
 * Never throws.
 */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as AppRole,
  };
}

/**
 * Guard: requires an authenticated user. Redirects to /login if missing.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Guard: requires superadmin. Redirects to /dashboard if insufficient.
 */
export async function requireSuperadmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (session.role !== "superadmin") redirect("/dashboard");
  return session;
}

/**
 * Partners visible to the current user (all for superadmin; membership-based otherwise).
 */
export async function getVisiblePartners() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("id, slug, name, custom_domain, logo_url, primary_color, accent_color, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
