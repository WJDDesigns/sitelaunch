import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const IMPERSONATE_COOKIE = "sl_impersonate";

export type AppRole = "superadmin" | "partner_owner" | "partner_member" | "client";
export type PlanType = "agency" | "agency_plus_partners";
export type PlanTier = "free" | "paid" | "unlimited" | "enterprise";

export interface SessionContext {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
}

export interface AccountContext {
  id: string;               // top-level partner id
  slug: string;
  name: string;
  planType: PlanType;
  planTier: PlanTier;
  submissionsMonthlyLimit: number | null;
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
 * Partners visible to the current user.
 *
 * - Superadmin: every partner, globally.
 * - Everyone else: partners belonging to their account tree (the root partner
 *   plus any direct sub-partners). Scoped explicitly in app code rather than
 *   relying solely on RLS so cross-account leaks are impossible even if a
 *   policy is mis-written.
 */
export async function getVisiblePartners() {
  const session = await getSession();
  const supabase = await createClient();

  const selectCols =
    "id, slug, name, custom_domain, logo_url, primary_color, accent_color, parent_partner_id, plan_type, plan_tier, created_at";

  if (session?.role === "superadmin") {
    const { data } = await supabase
      .from("partners")
      .select(selectCols)
      .order("created_at", { ascending: false });
    return data ?? [];
  }

  if (!session) return [];

  const account = await getCurrentAccount(session.userId);
  if (!account) return [];

  // Root + direct sub-partners. Covers the 2-level hierarchy we support today.
  const { data } = await supabase
    .from("partners")
    .select(selectCols)
    .or(`id.eq.${account.id},parent_partner_id.eq.${account.id}`)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Check if superadmin is currently impersonating a partner.
 * Returns the partner ID or null.
 */
export async function getImpersonatingPartnerId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve the current user's primary account — i.e. the top-level partner
 * tree they belong to. Superadmin users who don't own a partner return null.
 *
 * If the user is a superadmin with an active impersonation cookie, returns
 * the impersonated partner's context instead.
 */
export async function getCurrentAccount(userId: string): Promise<AccountContext | null> {
  const supabase = await createClient();

  // Check for superadmin impersonation
  const impersonateId = await getImpersonatingPartnerId();
  if (impersonateId) {
    // Verify caller is actually a superadmin before honoring the cookie
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (profile?.role === "superadmin") {
      const { data: partner } = await supabase
        .from("partners")
        .select("id, slug, name, plan_type, plan_tier, submissions_monthly_limit")
        .eq("id", impersonateId)
        .maybeSingle();
      if (partner) {
        return {
          id: partner.id,
          slug: partner.slug,
          name: partner.name,
          planType: (partner.plan_type ?? "agency") as PlanType,
          planTier: (partner.plan_tier ?? "free") as PlanTier,
          submissionsMonthlyLimit: partner.submissions_monthly_limit,
        };
      }
    }
  }

  const { data: memberships } = await supabase
    .from("partner_members")
    .select("partner_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!memberships || memberships.length === 0) return null;

  // Walk to the top-level partner for each membership; pick the first one we
  // find. Most users will have exactly one.
  for (const m of memberships) {
    const { data: partner } = await supabase
      .from("partners")
      .select("id, slug, name, parent_partner_id, plan_type, plan_tier, submissions_monthly_limit")
      .eq("id", m.partner_id)
      .maybeSingle();
    if (!partner) continue;

    // If this is a sub-partner, walk up.
    let current = partner;
    while (current.parent_partner_id) {
      const { data: parent } = await supabase
        .from("partners")
        .select("id, slug, name, parent_partner_id, plan_type, plan_tier, submissions_monthly_limit")
        .eq("id", current.parent_partner_id)
        .maybeSingle();
      if (!parent) break;
      current = parent;
    }

    return {
      id: current.id,
      slug: current.slug,
      name: current.name,
      planType: (current.plan_type ?? "agency") as PlanType,
      planTier: (current.plan_tier ?? "free") as PlanTier,
      submissionsMonthlyLimit: current.submissions_monthly_limit,
    };
  }

  return null;
}

/**
 * For partner_member users: get their directly-assigned partner context.
 * Returns the partner they were invited to manage (not the root account).
 */
export async function getPartnerMemberContext(userId: string): Promise<{
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
  partnerLogoUrl: string | null;
  allowFormEditing: boolean;
} | null> {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("partner_members")
    .select("partner_id, role")
    .eq("user_id", userId)
    .eq("role", "partner_member")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: partner } = await supabase
    .from("partners")
    .select("id, name, slug, logo_url, allow_partner_form_editing")
    .eq("id", membership.partner_id)
    .maybeSingle();

  if (!partner) return null;

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerSlug: partner.slug,
    partnerLogoUrl: partner.logo_url,
    allowFormEditing: partner.allow_partner_form_editing ?? false,
  };
}

/**
 * Monthly submission count for an account (rolled up across its sub-partners).
 */
export async function getAccountUsage(accountId: string): Promise<number> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("submissions_usage")
    .select("count")
    .eq("account_id", accountId)
    .eq("month", monthStart.toISOString());

  return (data ?? []).reduce((acc, r) => acc + (r.count ?? 0), 0);
}
