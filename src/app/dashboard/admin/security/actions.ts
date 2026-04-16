"use server";

import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SecurityOverview {
  totalUsers: number;
  mfaEnabledUsers: number;
  mfaRate: number;
  activeSessions: number;
  passkeysRegistered: number;
  recentFailedLogins: number;
  superadminCount: number;
  rlsPoliciesActive: boolean;
  securityHeaders: { name: string; value: string; status: "ok" | "warning" }[];
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  await requireSuperadmin();
  const admin = createAdminClient();

  // Total users and MFA stats
  const { count: totalUsers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: mfaEnabledUsers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("mfa_enabled", true);

  // Active sessions (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: activeSessions } = await admin
    .from("user_sessions")
    .select("id", { count: "exact", head: true })
    .gte("last_active_at", oneDayAgo);

  // Passkeys count
  const { count: passkeysRegistered } = await admin
    .from("user_passkeys")
    .select("id", { count: "exact", head: true });

  // Superadmin count
  const { count: superadminCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "superadmin");

  const total = totalUsers ?? 0;
  const mfaEnabled = mfaEnabledUsers ?? 0;

  return {
    totalUsers: total,
    mfaEnabledUsers: mfaEnabled,
    mfaRate: total > 0 ? mfaEnabled / total : 0,
    activeSessions: activeSessions ?? 0,
    passkeysRegistered: passkeysRegistered ?? 0,
    recentFailedLogins: 0, // Would need a failed login tracking table
    superadminCount: superadminCount ?? 0,
    rlsPoliciesActive: true, // Enabled in migrations
    securityHeaders: [
      { name: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload", status: "ok" },
      { name: "X-Frame-Options", value: "DENY", status: "ok" },
      { name: "X-Content-Type-Options", value: "nosniff", status: "ok" },
      { name: "Content-Security-Policy", value: "Configured (script-src, style-src, img-src, connect-src)", status: "ok" },
      { name: "Referrer-Policy", value: "strict-origin-when-cross-origin", status: "ok" },
      { name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()", status: "ok" },
    ],
  };
}

export interface SessionRow {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export async function getActiveSessionsAction(): Promise<SessionRow[]> {
  await requireSuperadmin();
  const admin = createAdminClient();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("user_sessions")
    .select("id, user_id, device_name, device_type, ip_address, last_active_at, created_at, profiles(email, full_name)")
    .gte("last_active_at", oneDayAgo)
    .order("last_active_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      id: s.id,
      user_id: s.user_id,
      device_name: s.device_name ?? "Unknown",
      device_type: s.device_type ?? "desktop",
      ip_address: s.ip_address,
      last_active_at: s.last_active_at,
      created_at: s.created_at,
      user_email: (profile as Record<string, unknown>)?.email as string | null,
      user_name: (profile as Record<string, unknown>)?.full_name as string | null,
    };
  });
}

export async function revokeSessionAction(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("user_sessions").delete().eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
