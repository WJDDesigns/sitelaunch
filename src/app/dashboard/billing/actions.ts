"use server";

import { redirect } from "next/navigation";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLANS, getOrCreateCustomer, tierToDbEnum, type BillingTier } from "@/lib/stripe";

/**
 * Create a Stripe Checkout session for upgrading to a paid plan.
 */
export async function createCheckoutAction(tier: BillingTier) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found");

  const plan = PLANS[tier];
  if (!plan.stripePriceId) throw new Error("No Stripe price configured for this tier");

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(account.id, account.name, session.email);

  // Save Stripe customer ID to partner if not already there
  const admin = createAdminClient();
  await admin
    .from("partners")
    .update({ stripe_customer_id: customerId })
    .eq("id", account.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?upgraded=true`,
    cancel_url: `${appUrl}/dashboard/billing`,
    subscription_data: {
      metadata: {
        sitelaunch_partner_id: account.id,
        sitelaunch_tier: tier,
      },
    },
    metadata: {
      sitelaunch_partner_id: account.id,
    },
  });

  if (checkoutSession.url) {
    redirect(checkoutSession.url);
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: partner.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
  });

  redirect(portalSession.url);
}
