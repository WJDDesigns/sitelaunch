"use server";

import { redirect } from "next/navigation";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";
import { getPlanBySlug } from "@/lib/plans";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";

/**
 * Validate a coupon code for a billing plan (client-side validation before checkout).
 */
export async function validateBillingCouponAction(
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
 * Create a Stripe Checkout session for upgrading to a paid plan.
 * Now reads the plan from the DB instead of hardcoded config.
 * Supports optional coupon code for discounts.
 *
 * Returns a result object instead of throwing so that error messages
 * are preserved in production (Next.js strips thrown error messages).
 */
export async function createCheckoutAction(
  planSlug: string,
  couponCode?: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const plan = await getPlanBySlug(planSlug);
  if (!plan) return { ok: false, error: "Plan not found." };
  if (!plan.stripePriceId) return { ok: false, error: "No Stripe price configured for this plan. Ask your admin to set up Stripe." };

  // Validate and redeem coupon if provided
  let stripeCouponId: string | null = null;

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, plan.priceMonthly);
    if (!couponResult.valid) {
      return { ok: false, error: couponResult.reason };
    }
    stripeCouponId = couponResult.coupon.stripeCouponId;

    // Verify the Stripe coupon exists; if not, re-create it
    if (stripeCouponId) {
      try {
        await stripe.coupons.retrieve(stripeCouponId);
      } catch {
        // Coupon doesn't exist in this Stripe account -- re-create it
        console.log("[billing] Stripe coupon not found, re-creating:", stripeCouponId, "for code:", couponCode);
        try {
          const newCoupon = await stripe.coupons.create({
            ...(couponResult.coupon.type === "percentage"
              ? { percent_off: couponResult.coupon.value }
              : { amount_off: couponResult.coupon.value, currency: "usd" }),
            duration: "once",
            name: couponResult.coupon.code,
            metadata: { linqme_code: couponResult.coupon.code },
          });
          stripeCouponId = newCoupon.id;
          // Update the DB with the new Stripe coupon ID
          const adminForCoupon = createAdminClient();
          await adminForCoupon
            .from("coupons")
            .update({ stripe_coupon_id: newCoupon.id })
            .eq("id", couponResult.coupon.id);
          console.log("[billing] Re-created Stripe coupon:", newCoupon.id);
        } catch (createErr) {
          console.error("[billing] Failed to re-create Stripe coupon:", createErr);
          return { ok: false, error: "Failed to apply coupon discount. Please try again or contact support." };
        }
      }
    } else {
      // No Stripe coupon ID stored -- create one now
      try {
        const newCoupon = await stripe.coupons.create({
          ...(couponResult.coupon.type === "percentage"
            ? { percent_off: couponResult.coupon.value }
            : { amount_off: couponResult.coupon.value, currency: "usd" }),
          duration: "once",
          name: couponResult.coupon.code,
          metadata: { linqme_code: couponResult.coupon.code },
        });
        stripeCouponId = newCoupon.id;
        const adminForCoupon = createAdminClient();
        await adminForCoupon
          .from("coupons")
          .update({ stripe_coupon_id: newCoupon.id })
          .eq("id", couponResult.coupon.id);
        console.log("[billing] Created new Stripe coupon:", newCoupon.id);
      } catch (createErr) {
        console.error("[billing] Failed to create Stripe coupon:", createErr);
        return { ok: false, error: "Failed to apply coupon discount. Please try again or contact support." };
      }
    }

    // Record redemption
    await redeemCoupon(
      couponResult.coupon.id,
      account.id,
      planSlug,
      couponResult.discountCents,
    );
  }

  // Get or create Stripe customer
  let customerId: string;
  try {
    customerId = await getOrCreateCustomer(account.id, account.name, session.email);
  } catch (err) {
    console.error("[billing] Failed to get/create Stripe customer:", err);
    return { ok: false, error: "Failed to set up billing customer. Please try again." };
  }

  // Save Stripe customer ID to partner if not already there
  const admin = createAdminClient();
  await admin
    .from("partners")
    .update({ stripe_customer_id: customerId })
    .eq("id", account.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { ok: false, error: "App URL is not configured." };

  const checkoutParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?upgraded=true`,
    cancel_url: `${appUrl}/dashboard/billing`,
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

  try {
    console.log("[billing] Creating checkout session for partner:", account.id, "plan:", planSlug, "price:", plan.stripePriceId);
    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

    if (!checkoutSession.url) {
      return { ok: false, error: "Stripe did not return a checkout URL. Please try again." };
    }

    return { ok: true, url: checkoutSession.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    console.error("[billing] Stripe checkout session creation failed:", message, {
      partnerId: account.id,
      planSlug,
      stripePriceId: plan.stripePriceId,
      customerId,
      stripeCouponId,
    });
    return { ok: false, error: `Checkout failed: ${message}` };
  }
}

/**
 * Switch between paid plans (upgrade or downgrade) using Stripe proration.
 * - If user has an active subscription: updates it in-place with proration
 * - If user has no subscription (free→paid): falls through to checkout
 * Stripe automatically credits unused time on the old plan and charges
 * the prorated amount for the new plan.
 */
export async function switchPlanAction(
  targetSlug: string,
  couponCode?: string,
): Promise<{ ok: boolean; error?: string; redirectUrl?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found" };

  const targetPlan = await getPlanBySlug(targetSlug);
  if (!targetPlan) return { ok: false, error: "Plan not found" };
  if (!targetPlan.stripePriceId)
    return { ok: false, error: "No Stripe price configured for this plan." };

  const admin = createAdminClient();

  // Find active subscription
  const { data: activeSub } = await admin
    .from("subscriptions")
    .select("id, stripe_price_id")
    .eq("partner_id", account.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSub) {
    // No active subscription -- create checkout for new subscription
    const checkoutResult = await createCheckoutAction(targetSlug, couponCode);
    if (checkoutResult.ok) {
      return { ok: true, redirectUrl: checkoutResult.url };
    }
    return { ok: false, error: checkoutResult.error };
  }

  try {
    // Retrieve the Stripe subscription to get the subscription item ID
    const stripeSub = await stripe.subscriptions.retrieve(activeSub.id);
    const subscriptionItemId = stripeSub.items.data[0]?.id;

    if (!subscriptionItemId) {
      return { ok: false, error: "Could not find subscription item." };
    }

    // Update the subscription with proration
    await stripe.subscriptions.update(activeSub.id, {
      items: [
        {
          id: subscriptionItemId,
          price: targetPlan.stripePriceId,
        },
      ],
      proration_behavior: "create_prorations",
      metadata: {
        linqme_partner_id: account.id,
        linqme_tier: targetSlug,
      },
    });

    // The webhook will handle syncing the new tier to the DB
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to switch plan";
    return { ok: false, error: message };
  }
}

/**
 * Cancel subscription at end of billing period (paid → free).
 * The user keeps access until the current period ends, then the
 * webhook will downgrade them to free when `subscription.deleted` fires.
 */
export async function cancelSubscriptionAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found" };

  const admin = createAdminClient();

  const { data: activeSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("partner_id", account.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSub) {
    return { ok: false, error: "No active subscription found." };
  }

  try {
    await stripe.subscriptions.update(activeSub.id, {
      cancel_at_period_end: true,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel subscription";
    return { ok: false, error: message };
  }
}

/**
 * Re-activate a subscription that was set to cancel at period end.
 */
export async function reactivateSubscriptionAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found" };

  const admin = createAdminClient();

  const { data: activeSub } = await admin
    .from("subscriptions")
    .select("id, cancel_at_period_end")
    .eq("partner_id", account.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSub) {
    return { ok: false, error: "No active subscription found." };
  }

  if (!activeSub.cancel_at_period_end) {
    return { ok: false, error: "Subscription is not set to cancel." };
  }

  try {
    await stripe.subscriptions.update(activeSub.id, {
      cancel_at_period_end: false,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reactivate subscription";
    return { ok: false, error: message };
  }
}

/**
 * Open Stripe Customer Portal for managing subscription, payment methods, invoices.
 */
export async function openCustomerPortalAction() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found");

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("stripe_customer_id")
    .eq("id", account.id)
    .maybeSingle();

  if (!partner?.stripe_customer_id) {
    throw new Error("No Stripe customer found. Please subscribe to a plan first.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: partner.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
  });

  redirect(portalSession.url);
}
