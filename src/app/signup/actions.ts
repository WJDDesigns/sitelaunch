"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/notifications";
import { rateLimiter } from "@/lib/rate-limit";

export type SignupResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  if (!slug || slug.length < 2) return { available: false };

  // Only allow valid slug characters
  if (!/^[a-z0-9-]+$/.test(slug)) return { available: false };

  // Rate limit by IP
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success: withinLimit } = rateLimiter.check(`slug-check:${ip}`, 20, 60);
  if (!withinLimit) return { available: false };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("partners")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return { available: !existing };
}

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function signupAction(formData: FormData): Promise<SignupResult> {
  // Rate limit by IP
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success: withinLimit } = rateLimiter.check(`signup:${ip}`, 3, 60);
  if (!withinLimit) {
    return { ok: false, error: "Too many signup attempts. Please try again later." };
  }

  // Step 1: Account basics
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "");
  const slug = sanitizeSlug(slugRaw || companyName);
  const planType = String(formData.get("plan_type") ?? "agency");
  const selectedPlan = String(formData.get("selected_plan") ?? "free").trim();

  // Step 2: Business details
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const billingAddressLine1 = String(formData.get("billing_address_line1") ?? "").trim();
  const billingAddressLine2 = String(formData.get("billing_address_line2") ?? "").trim();
  const billingCity = String(formData.get("billing_city") ?? "").trim();
  const billingState = String(formData.get("billing_state") ?? "").trim();
  const billingZip = String(formData.get("billing_zip") ?? "").trim();
  const billingCountry = String(formData.get("billing_country") ?? "US").trim();

  // Step 3: Usage & preferences
  const teamSize = String(formData.get("team_size") ?? "").trim();
  const expectedMonthlyClients = String(formData.get("expected_monthly_clients") ?? "").trim();
  const referralSource = String(formData.get("referral_source") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();

  // TOS acceptance
  const tosAcceptedAt = String(formData.get("tos_accepted_at") ?? "").trim() || null;

  // Validation
  if (!email || !password || !companyName || !slug) {
    return { ok: false, error: "All fields are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!["agency", "agency_plus_partners"].includes(planType)) {
    return { ok: false, error: "Invalid plan type." };
  }

  const admin = createAdminClient();

  // 1. Make sure slug is free.
  const { data: existing } = await admin
    .from("partners")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `That workspace URL (${slug}) is already taken. Please pick another.`,
    };
  }

  // 2. Create the auth user — email NOT auto-confirmed; user must verify via email.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: companyName },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Failed to create account." };
  }
  const userId = created.user.id;

  // 3. Bootstrap the top-level partner + membership with all profile data.
  const { error: bootErr } = await admin.rpc("bootstrap_account", {
    p_owner_id: userId,
    p_company_name: companyName,
    p_slug: slug,
    p_plan_type: planType,
    p_phone: phone || null,
    p_website: website || null,
    p_industry: industry || null,
    p_billing_address_line1: billingAddressLine1 || null,
    p_billing_address_line2: billingAddressLine2 || null,
    p_billing_city: billingCity || null,
    p_billing_state: billingState || null,
    p_billing_zip: billingZip || null,
    p_billing_country: billingCountry || "US",
    p_team_size: teamSize || null,
    p_expected_monthly_clients: expectedMonthlyClients || null,
    p_referral_source: referralSource || null,
    p_tax_id: taxId || null,
  });
  if (bootErr) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: bootErr.message };
  }

  // 3b. Record TOS acceptance on the profile.
  if (tosAcceptedAt) {
    await admin
      .from("profiles")
      .update({ tos_accepted_at: tosAcceptedAt })
      .eq("id", userId);
  }

  // 4. Generate an email verification link and send it via Resend.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.linqme.io";
  // If they selected a paid plan, route them to checkout after verification
  const postVerifyPath = selectedPlan && selectedPlan !== "free"
    ? `/checkout?plan=${encodeURIComponent(selectedPlan)}`
    : "/dashboard";
  const redirectTo = `${appUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(postVerifyPath)}`;

  try {
    await sendVerificationEmail({ to: email, companyName, redirectTo });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[signup] verification email failed:", err);
    }
  }

  // 5. Send welcome email (non-blocking) — they'll see it alongside the verification email.
  try {
    await sendWelcomeEmail({
      to: email,
      companyName,
      slug,
      planType: planType as "agency" | "agency_plus_partners",
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[signup] welcome email failed:", err);
    }
  }

  // Don't sign them in — they must verify their email first.
  const verifyUrl = selectedPlan && selectedPlan !== "free"
    ? `/auth/verify-email?email=${encodeURIComponent(email)}&plan=${encodeURIComponent(selectedPlan)}`
    : `/auth/verify-email?email=${encodeURIComponent(email)}`;
  return { ok: true, next: verifyUrl };
}
