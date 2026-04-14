"use server";

import { redirect } from "next/navigation";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";
import { getPlanBySlug } from "@/lib/plans";

/**
 * Create a Stripe Checkout session for upgrading to a paid plan.
 * Now reads the plan from the DB instead of hardcoded config.
 */
export async function createCheckoutAction(planSlug: string) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found");

  const plan = await getPlanBySlug(planSlug);
  if (!plan) throw new Error("Plan not found");
  if (!plan.stripePriceId) throw new Error("No Stripe price configured for this plan. Ask your admin to set up Stripe.");

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
        sitelaunch_tier: plan.slug,
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
