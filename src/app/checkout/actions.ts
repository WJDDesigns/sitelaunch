"use server";

import { redirect } from "next/navigation";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";
import { getPlanBySlug } from "@/lib/plans";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";

export interface CheckoutResult {
  error?: string;
}

/**
 * Save or update the business profile fields on the partner record.
 */
export async function saveBusinessDetailsAction(
  partnerId: string,
  details: {
    phone: string;
    website: string;
    industry: string;
    billing_address_line1: string;
    billing_address_line2: string;
    billing_city: string;
    billing_state: string;
    billing_zip: string;
    billing_country: string;
    team_size: string;
    expected_monthly_clients: string;
    referral_source: string;
    tax_id: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  // Ensure user owns this partner
  if (!account || account.id !== partnerId) {
    return { ok: false, error: "Unauthorized." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update({
      phone: details.phone || null,
      website: details.website || null,
      industry: details.industry || null,
      billing_address_line1: details.billing_address_line1 || null,
      billing_address_line2: details.billing_address_line2 || null,
      billing_city: details.billing_city || null,
      billing_state: details.billing_state || null,
      billing_zip: details.billing_zip || null,
      billing_country: details.billing_country || "US",
      team_size: details.team_size || null,
      expected_monthly_clients: details.expected_monthly_clients || null,
      referral_source: details.referral_source || null,
      tax_id: details.tax_id || null,
    })
    .eq("id", partnerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Validate a coupon code for the checkout page.
 */
export async function validateCouponAction(
  code: string,
  planSlug: string,
): Promise<{
  valid: boolean;
  message: string;
  discountLabel?: string;
  discountCents?: number;
}> {
  const plan = await getPlanBySlug(planSlug);
  if (!plan) return { valid: false, message: "Plan not found." };

  const result = await validateCoupon(code, plan.priceMonthly);
  if (!result.valid) {
    return { valid: false, message: result.reason };
  }

  const label =
    result.coupon.type === "percentage"
      ? `${result.coupon.value}% off`
      : `$${(result.coupon.value / 100).toFixed(2)} off`;

  return {
    valid: true,
    message: `Coupon applied: ${label}`,
    discountLabel: label,
    discountCents: result.discountCents,
  };
}

/**
 * Create a Stripe Checkout session with optional coupon.
 */
export async function createCheckoutSessionAction(
  planSlug: string,
  couponCode?: string,
): Promise<CheckoutResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { error: "No account found. Please complete your profile first." };

  const plan = await getPlanBySlug(planSlug);
  if (!plan) return { error: "Plan not found." };
  if (!plan.stripePriceId) {
    return { error: "Stripe is not configured for this plan. Contact support." };
  }

  // Validate coupon if provided
  let stripeCouponId: string | null = null;
  let validatedCoupon: Awaited<ReturnType<typeof validateCoupon>> | null = null;

  if (couponCode) {
    validatedCoupon = await validateCoupon(couponCode, plan.priceMonthly);
    if (!validatedCoupon.valid) {
      return { error: validatedCoupon.reason };
    }
    stripeCouponId = validatedCoupon.coupon.stripeCouponId;

    // Record redemption
    await redeemCoupon(
      validatedCoupon.coupon.id,
      account.id,
      planSlug,
      validatedCoupon.discountCents,
    );
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(account.id, account.name, session.email);

  // Save Stripe customer ID
  const admin = createAdminClient();
  await admin
    .from("partners")
    .update({ stripe_customer_id: customerId })
    .eq("id", account.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");

  const checkoutParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?upgraded=true`,
    cancel_url: `${appUrl}/checkout?plan=${planSlug}`,
    subscription_data: {
      metadata: {
        linqme_partner_id: account.id,
        linqme_tier: plan.slug,
      },
    },
    metadata: {
      linqme_partner_id: account.id,
    },
  };

  // Apply Stripe coupon/discount
  if (stripeCouponId) {
    checkoutParams.discounts = [{ coupon: stripeCouponId }];
  }

  const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

  if (checkoutSession.url) {
    redirect(checkoutSession.url);
  }

  return { error: "Failed to create checkout session." };
}
