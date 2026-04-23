"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { sendMail } from "@/lib/email";
import { getRenderedEmail, emailTemplate } from "@/lib/email-templates";

/* ── Helpers ─────────────────────────────────── */

/** Generate a unique coupon code like LINQME-ABCD-1234 */
function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => nums[Math.floor(Math.random() * nums.length)]).join("");
  return `LINQME-${part1}-${part2}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ── Actions ─────────────────────────────────── */

export interface CouponConfig {
  type: "percentage" | "fixed";
  value: number;
  minPlanSlug: string; // "" means all plans
}

export async function sendAgencyInviteAction(
  email: string,
  name?: string,
  couponConfig?: CouponConfig,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperadmin();

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { ok: false, error: "A valid email address is required." };
  }

  const discountType = couponConfig?.type ?? "percentage";
  const discountValue = couponConfig?.value ?? 20;
  const minPlanSlug = couponConfig?.minPlanSlug ?? "";

  if (discountValue <= 0) {
    return { ok: false, error: "Discount value must be greater than zero." };
  }
  if (discountType === "percentage" && discountValue > 100) {
    return { ok: false, error: "Percentage discount cannot exceed 100%." };
  }

  const admin = createAdminClient();

  // Look up minimum plan price if a specific plan is selected
  let minPlanPrice = 0;
  if (minPlanSlug) {
    const { data: plan } = await admin
      .from("plans")
      .select("price_monthly")
      .eq("slug", minPlanSlug)
      .maybeSingle();
    if (plan) minPlanPrice = plan.price_monthly as number;
  }

  // Check for existing pending invite to same email
  const { data: existing } = await admin
    .from("agency_invites")
    .select("id, status")
    .eq("email", trimmedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "A pending invite already exists for this email. Resend it instead." };
  }

  // Generate unique coupon code (retry if collision)
  let couponCode = generateCouponCode();
  for (let i = 0; i < 5; i++) {
    const { data: dup } = await admin
      .from("agency_invites")
      .select("id")
      .eq("coupon_code", couponCode)
      .maybeSingle();
    if (!dup) break;
    couponCode = generateCouponCode();
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Insert invite
  const { data: invite, error: insertErr } = await admin
    .from("agency_invites")
    .insert({
      email: trimmedEmail,
      name: name?.trim() || null,
      coupon_code: couponCode,
      invited_by: session.userId,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (insertErr || !invite) {
    return { ok: false, error: insertErr?.message ?? "Failed to create invite." };
  }

  // Create coupon in Stripe first, then save to DB with the Stripe ID
  const discountLabel = discountType === "percentage"
    ? `${discountValue}% off`
    : `$${(discountValue / 100).toFixed(0)} off`;

  let stripeCouponId: string | null = null;
  try {
    const stripeCoupon = await stripe.coupons.create({
      ...(discountType === "percentage"
        ? { percent_off: discountValue }
        : { amount_off: discountValue, currency: "usd" }),
      duration: "once",
      name: couponCode,
      max_redemptions: 1,
      redeem_by: Math.floor(expiresAt.getTime() / 1000),
      metadata: { linqme_code: couponCode, invite_email: trimmedEmail },
    });
    stripeCouponId = stripeCoupon.id;
  } catch (err) {
    console.error("[invites] Failed to create Stripe coupon:", err);
    // Non-blocking -- the checkout fallback will auto-create if missing
  }

  await admin.from("coupons").insert({
    code: couponCode,
    description: `Agency invite for ${trimmedEmail} (${discountLabel})`,
    type: discountType,
    value: discountValue,
    min_plan_price: minPlanPrice,
    expires_at: expiresAt.toISOString(),
    max_redemptions: 1,
    times_redeemed: 0,
    is_active: true,
    stripe_coupon_id: stripeCouponId,
  });

  // Build signup URL with coupon pre-filled
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io";
  const protocol = rootDomain.includes("localhost") ? "http" : "https";
  const signupUrl = `${protocol}://${rootDomain}/signup?coupon=${encodeURIComponent(couponCode)}`;

  // Send email
  const dbEmail = await getRenderedEmail("agency_invite", {
    email: trimmedEmail,
    coupon_code: couponCode,
    signup_url: signupUrl,
    expires_date: formatDate(expiresAt),
  });

  const fallbackHtml = emailTemplate({
    heading: "You're invited to linqme",
    body: `
      <p>You've been hand-picked to get early access to <strong>linqme</strong> -- the all-in-one client onboarding platform built for agencies.</p>
      <p>Your exclusive coupon code: <strong style="color:#696cf8;font-size:18px;font-family:monospace;">${couponCode}</strong></p>
      <p>This invitation expires on ${formatDate(expiresAt)}.</p>
    `,
    cta: { label: "Get Started Free", url: signupUrl },
  });

  const result = await sendMail({
    to: trimmedEmail,
    subject: dbEmail?.subject ?? "You're invited to try linqme -- exclusive access",
    html: dbEmail?.html ?? fallbackHtml,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Failed to send email." };
  }

  revalidatePath("/dashboard/admin/invites");
  return { ok: true };
}

export async function resendInviteAction(
  inviteId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperadmin();

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("agency_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (!invite) return { ok: false, error: "Invite not found." };
  if (invite.status !== "pending") return { ok: false, error: "Can only resend pending invites." };

  // Extend expiry
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await admin
    .from("agency_invites")
    .update({ expires_at: newExpiry.toISOString() })
    .eq("id", inviteId);

  // Also extend coupon expiry if it exists
  await admin
    .from("coupons")
    .update({ expires_at: newExpiry.toISOString() })
    .ilike("code", invite.coupon_code)
    .then(() => {});

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io";
  const protocol = rootDomain.includes("localhost") ? "http" : "https";
  const signupUrl = `${protocol}://${rootDomain}/signup?coupon=${encodeURIComponent(invite.coupon_code)}`;

  const dbEmail = await getRenderedEmail("agency_invite", {
    email: invite.email,
    coupon_code: invite.coupon_code,
    signup_url: signupUrl,
    expires_date: formatDate(newExpiry),
  });

  const fallbackHtml = emailTemplate({
    heading: "You're invited to linqme",
    body: `
      <p>Just a reminder -- you've been invited to try <strong>linqme</strong>!</p>
      <p>Your exclusive coupon code: <strong style="color:#696cf8;font-size:18px;font-family:monospace;">${invite.coupon_code}</strong></p>
      <p>This invitation expires on ${formatDate(newExpiry)}.</p>
    `,
    cta: { label: "Get Started Free", url: signupUrl },
  });

  const result = await sendMail({
    to: invite.email,
    subject: dbEmail?.subject ?? "Reminder: You're invited to try linqme",
    html: dbEmail?.html ?? fallbackHtml,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Failed to send email." };

  revalidatePath("/dashboard/admin/invites");
  return { ok: true };
}

export async function revokeInviteAction(
  inviteId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperadmin();

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("agency_invites")
    .select("coupon_code")
    .eq("id", inviteId)
    .single();

  if (!invite) return { ok: false, error: "Invite not found." };

  // Revoke invite
  const { error } = await admin
    .from("agency_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) return { ok: false, error: error.message };

  // Deactivate the linked coupon
  await admin
    .from("coupons")
    .update({ is_active: false })
    .ilike("code", invite.coupon_code)
    .then(() => {});

  revalidatePath("/dashboard/admin/invites");
  return { ok: true };
}
