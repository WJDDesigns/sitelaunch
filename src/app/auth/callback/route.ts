import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function buildOrigin(request: NextRequest): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.endsWith(".lvh.me") || host === "lvh.me" ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = buildOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this OAuth user has a partner account yet
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensurePartnerExists(user.id, user.email ?? "", user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");
      }

      // Middleware will handle MFA enforcement (redirect to /auth/mfa/setup if needed)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/** Check if an email is a platform superadmin */
function isSuperadminEmail(email: string): boolean {
  const raw = process.env.SUPERADMIN_EMAILS ?? "";
  if (!raw) return false;
  const list = raw.split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

/**
 * Ensure an OAuth user has a partner account.
 * If they signed up via OAuth (Google/GitHub/Apple), they skip the signup form
 * so we need to bootstrap their workspace automatically.
 */
async function ensurePartnerExists(userId: string, email: string, fullName: string) {
  const admin = createAdminClient();
  const isSuperadmin = isSuperadminEmail(email);

  // Always ensure the profile role is correct for superadmins
  if (isSuperadmin) {
    await admin
      .from("profiles")
      .update({ role: "superadmin" })
      .eq("id", userId);
  }

  // Check if they already have a partner membership
  const { data: membership } = await admin
    .from("partner_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership) return; // Already has an account

  // Generate a slug from the email or name
  const baseName = fullName || email.split("@")[0];
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "workspace";

  // Make slug unique
  let finalSlug = slug;
  let attempt = 0;
  while (true) {
    const { data: existing } = await admin
      .from("partners")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    finalSlug = `${slug}-${attempt}`;
  }

  // Ensure profile exists
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  const role = isSuperadmin ? "superadmin" : "partner_owner";

  if (!profile) {
    await admin.from("profiles").insert({
      id: userId,
      email,
      full_name: fullName || null,
      role,
    });
  }

  // Try to bootstrap via RPC (same as signup), fall back to manual insert
  const { error: rpcError } = await admin.rpc("bootstrap_account", {
    p_owner_id: userId,
    p_company_name: baseName,
    p_slug: finalSlug,
    p_plan_type: "agency",
    p_phone: null,
    p_website: null,
    p_industry: null,
    p_billing_address_line1: null,
    p_billing_address_line2: null,
    p_billing_city: null,
    p_billing_state: null,
    p_billing_zip: null,
    p_billing_country: "US",
    p_team_size: null,
    p_expected_monthly_clients: null,
    p_referral_source: null,
    p_tax_id: null,
  });

  if (rpcError) {
    console.error("[auth/callback] bootstrap_account failed:", rpcError.message);
  }

  // Re-assert superadmin role after bootstrap (in case the RPC overwrote it)
  if (isSuperadmin) {
    await admin
      .from("profiles")
      .update({ role: "superadmin" })
      .eq("id", userId);
  }
}
