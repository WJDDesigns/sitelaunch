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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkoutParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?upgraded=true`,
    cancel_url: `${appUrl}/checkout?plan=${planSlug}`,
    subscription_data: {
      metadata: {
        sitelaunch_partner_id: account.id,
        sitelaunch_tier: plan.slug,
      },
    },
    metadata: {
      sitelaunch_partner_id: account.id,
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
