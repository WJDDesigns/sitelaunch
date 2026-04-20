"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateCustomer, tierToDbEnum, type BillingTier } from "@/lib/stripe";
import { getPlanBySlug } from "@/lib/plans";

/**
 * Superadmin: manually change a partner's plan tier.
 * Updates the DB directly and optionally creates/cancels Stripe subscription.
 */
export async function adminChangePlanAction(partnerId: string, newTier: BillingTier | string) {
  const session = await requireSuperadmin();
  const admin = createAdminClient();

  const { data: partner } = await admin
    .from("partners")
    .select("id, name, plan_tier, stripe_customer_id, support_email")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner) throw new Error("Partner not found");

  // Fetch plan from DB
  const plan = await getPlanBySlug(newTier);
  if (!plan) throw new Error("Plan not found");

  const dbTier = tierToDbEnum(newTier as BillingTier);

  // Update the DB plan_tier and limits
  await admin
    .from("partners")
    .update({
      plan_tier: dbTier,
      submissions_monthly_limit: plan.submissionsMonthlyLimit,
    })
    .eq("id", partnerId);

  // If upgrading to paid plan and partner has Stripe customer, create subscription
  if (newTier !== "free" && partner.stripe_customer_id && plan.stripePriceId) {
    // Cancel any existing subscriptions first
    const { data: existingSubs } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("partner_id", partnerId)
      .in("status", ["active", "trialing"]);

    for (const sub of existingSubs ?? []) {
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch {
        // Subscription may already be canceled in Stripe
      }
    }

    // Create new subscription
    try {
      await stripe.subscriptions.create({
        customer: partner.stripe_customer_id,
        items: [{ price: plan.stripePriceId }],
        metadata: {
          linqme_partner_id: partnerId,
          linqme_tier: newTier,
        },
      });
    } catch (err) {
      console.error("[billing] Failed to create Stripe subscription:", err);
      // DB is already updated, Stripe will sync via webhook
    }
  }

  // If downgrading to free, cancel active subscriptions
  if (newTier === "free" && partner.stripe_customer_id) {
    const { data: existingSubs } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("partner_id", partnerId)
      .in("status", ["active", "trialing"]);

    for (const sub of existingSubs ?? []) {
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch {
        // already canceled
      }
    }
  }

  // Log the manual change
  await admin.from("billing_events").insert({
    partner_id: partnerId,
    event_type: "manual_change",
    description: `Plan manually changed to ${plan.name} (${newTier}) by superadmin`,
    created_by: session.userId,
    metadata: {
      old_tier: partner.plan_tier,
      new_tier: newTier,
      changed_by: session.email,
    },
  });

  revalidatePath("/dashboard/admin/billing");
  revalidatePath(`/dashboard/partners/${partnerId}`);
}

/**
 * Superadmin: issue a refund for a specific invoice.
 */
export async function adminRefundAction(invoiceId: string, reason?: string) {
  const session = await requireSuperadmin();
  const admin = createAdminClient();

  const { data: invoice } = await admin
    .from("invoices")
    .select("id, partner_id, amount_paid, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "paid") throw new Error("Can only refund paid invoices");

  // Find the charge via Stripe
  const stripeInvoice = await stripe.invoices.retrieve(invoiceId) as unknown as Record<string, unknown>;
  const rawPI = stripeInvoice.payment_intent;
  const paymentIntentId =
    typeof rawPI === "string"
      ? rawPI
      : (rawPI as { id?: string } | null)?.id;

  if (!paymentIntentId) throw new Error("No payment intent found for this invoice");

  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
    metadata: {
      linqme_refunded_by: session.email,
      linqme_reason: reason ?? "Admin-initiated refund",
    },
  });

  // Log the refund
  await admin.from("billing_events").insert({
    partner_id: invoice.partner_id,
    event_type: "refund_issued",
    description: `Refund of $${(invoice.amount_paid / 100).toFixed(2)} issued by superadmin${reason ? `: ${reason}` : ""}`,
    created_by: session.userId,
    metadata: { invoice_id: invoiceId, amount: invoice.amount_paid, reason },
  });

  revalidatePath("/dashboard/admin/billing");
}

/**
 * Superadmin: ensure Stripe products/prices exist.
 * Returns the price IDs for configuration.
 */
export async function adminSetupStripeAction() {
  await requireSuperadmin();

  const { ensureStripeProducts } = await import("@/lib/stripe");
  const priceIds = await ensureStripeProducts();

  return priceIds;
}
