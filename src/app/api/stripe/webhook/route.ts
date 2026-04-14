import { NextRequest, NextResponse } from "next/server";
import { stripe, tierToDbEnum } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(admin, event, sub);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.created":
      case "invoice.finalized":
      case "invoice.voided": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoice(admin, event, invoice);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(admin, event, charge);
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ── Subscription lifecycle ─────────────────────────────────── */
async function handleSubscriptionChange(
  admin: ReturnType<typeof createAdminClient>,
  event: Stripe.Event,
  sub: Stripe.Subscription,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Find partner by Stripe customer ID
  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!partner) {
    console.warn(`No partner found for Stripe customer ${customerId}`);
    return;
  }

  // Determine plan tier from price metadata
  const priceId = sub.items.data[0]?.price.id;
  const priceMeta = sub.items.data[0]?.price.metadata;
  const tier = priceMeta?.sitelaunch_tier ?? "pro";

  // In Stripe SDK v22+ period dates are on the latest_invoice or accessed via any
  const subAny = sub as unknown as Record<string, unknown>;
  const periodStart = subAny.current_period_start as number | undefined;
  const periodEnd = subAny.current_period_end as number | undefined;

  // Upsert subscription record
  await admin.from("subscriptions").upsert({
    id: sub.id,
    partner_id: partner.id,
    stripe_customer_id: customerId,
    stripe_price_id: priceId,
    plan_tier: tier,
    status: sub.status,
    current_period_start: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  });

  // Sync plan_tier and limits on the partners table for active subscriptions
  if (sub.status === "active" || sub.status === "trialing") {
    const dbTier = tierToDbEnum(tier as "free" | "pro" | "enterprise");
    await admin
      .from("partners")
      .update({
        plan_tier: dbTier,
        submissions_monthly_limit: tier === "free" ? 1 : null,
      })
      .eq("id", partner.id);
  } else if (sub.status === "canceled" || sub.status === "unpaid") {
    // Downgrade to free on cancellation
    await admin
      .from("partners")
      .update({
        plan_tier: "free",
        submissions_monthly_limit: 1,
      })
      .eq("id", partner.id);
  }

  // Log billing event
  const eventType =
    event.type === "customer.subscription.created"
      ? "subscription_created"
      : event.type === "customer.subscription.deleted"
      ? "subscription_canceled"
      : "subscription_updated";

  await admin.from("billing_events").insert({
    partner_id: partner.id,
    event_type: eventType,
    description: `Subscription ${sub.status} — ${tier} plan`,
    stripe_event_id: event.id,
    metadata: { subscription_id: sub.id, status: sub.status, tier },
  });
}

/* ── Invoice events ─────────────────────────────────────────── */
async function handleInvoice(
  admin: ReturnType<typeof createAdminClient>,
  event: Stripe.Event,
  invoice: Stripe.Invoice,
) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!partner) return;

  const invAny = invoice as unknown as Record<string, unknown>;
  const rawSub = invAny.subscription;
  const subscriptionId =
    typeof rawSub === "string"
      ? rawSub
      : (rawSub as { id?: string } | null)?.id ?? null;

  await admin.from("invoices").upsert({
    id: invoice.id,
    partner_id: partner.id,
    stripe_customer_id: customerId,
    subscription_id: subscriptionId,
    status: invoice.status ?? "draft",
    amount_due: invoice.amount_due ?? 0,
    amount_paid: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? "usd",
    invoice_url: invoice.hosted_invoice_url ?? null,
    invoice_pdf: invoice.invoice_pdf ?? null,
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    due_date: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString()
      : null,
    paid_at:
      invoice.status === "paid" && invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
  });

  // Log payment events
  if (event.type === "invoice.paid") {
    await admin.from("billing_events").insert({
      partner_id: partner.id,
      event_type: "payment_succeeded",
      description: `Payment of $${((invoice.amount_paid ?? 0) / 100).toFixed(2)} succeeded`,
      stripe_event_id: event.id,
      metadata: { invoice_id: invoice.id, amount: invoice.amount_paid },
    });
  } else if (event.type === "invoice.payment_failed") {
    await admin.from("billing_events").insert({
      partner_id: partner.id,
      event_type: "payment_failed",
      description: `Payment of $${((invoice.amount_due ?? 0) / 100).toFixed(2)} failed`,
      stripe_event_id: event.id,
      metadata: { invoice_id: invoice.id, amount: invoice.amount_due },
    });
  }
}

/* ── Refund events ──────────────────────────────────────────── */
async function handleRefund(
  admin: ReturnType<typeof createAdminClient>,
  event: Stripe.Event,
  charge: Stripe.Charge,
) {
  const customerId =
    typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  if (!customerId) return;

  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!partner) return;

  await admin.from("billing_events").insert({
    partner_id: partner.id,
    event_type: "refund_issued",
    description: `Refund of $${((charge.amount_refunded ?? 0) / 100).toFixed(2)} issued`,
    stripe_event_id: event.id,
    metadata: { charge_id: charge.id, amount_refunded: charge.amount_refunded },
  });
}
