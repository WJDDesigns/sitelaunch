import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

/* ── Plan tier ↔ Stripe price mapping ─────────────────────── */

export type BillingTier = "free" | "pro" | "enterprise";

export interface PlanConfig {
  tier: BillingTier;
  name: string;
  /** Monthly price in cents (0 = free) */
  priceMonthly: number;
  /** Stripe price ID — set after products are created, or from env */
  stripePriceId: string | null;
  submissionsMonthlyLimit: number | null; // null = unlimited
  features: string[];
}

/**
 * Plan definitions. Stripe price IDs are set via env vars so the same
 * code works across dev / staging / production Stripe accounts.
 */
export const PLANS: Record<BillingTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Starlink",
    priceMonthly: 0,
    stripePriceId: null, // no Stripe subscription for free
    submissionsMonthlyLimit: 1,
    features: [
      "Your own branded workspace",
      "Unlimited form fields",
      "File uploads",
      "1 submission / month",
    ],
  },
  pro: {
    tier: "pro",
    name: "Supernova",
    priceMonthly: 14900, // $149
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    submissionsMonthlyLimit: null, // unlimited
    features: [
      "Everything in Starlink",
      "Unlimited submissions",
      "Custom domain",
      "Branded emails",
      "Full white-labeling",
    ],
  },
  enterprise: {
    tier: "enterprise",
    name: "Galactic",
    priceMonthly: 39900, // $399
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
    submissionsMonthlyLimit: null,
    features: [
      "Everything in Supernova",
      "Priority support",
      "API access (coming)",
      "Dedicated success contact",
    ],
  },
};

/** Map old plan_tier enum values to new billing tiers */
export function mapLegacyTier(dbTier: string): BillingTier {
  switch (dbTier) {
    case "paid":
    case "unlimited":
      return "pro";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

/** Map billing tier back to the DB plan_tier enum */
export function tierToDbEnum(tier: BillingTier): string {
  switch (tier) {
    case "pro":
      return "paid";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

/**
 * Create Stripe products and prices if they don't exist yet.
 * Idempotent — only creates if the env-based price IDs are missing.
 * Returns the price IDs that should be saved to env vars.
 */
export async function ensureStripeProducts(): Promise<Record<BillingTier, string | null>> {
  const results: Record<BillingTier, string | null> = { free: null, pro: null, enterprise: null };

  for (const plan of [PLANS.pro, PLANS.enterprise]) {
    if (plan.stripePriceId) {
      results[plan.tier] = plan.stripePriceId;
      continue;
    }

    // Search for existing product by metadata
    const existing = await stripe.products.search({
      query: `metadata["sitelaunch_tier"]:"${plan.tier}"`,
    });

    let product: Stripe.Product;
    if (existing.data.length > 0) {
      product = existing.data[0];
    } else {
      product = await stripe.products.create({
        name: `SiteLaunch ${plan.name}`,
        metadata: { sitelaunch_tier: plan.tier },
      });
    }

    // Look for an active monthly price at the correct amount
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: "recurring",
    });

    let price = prices.data.find(
      (p) =>
        p.unit_amount === plan.priceMonthly &&
        p.recurring?.interval === "month",
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.priceMonthly,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { sitelaunch_tier: plan.tier },
      });
    }

    results[plan.tier] = price.id;
  }

  return results;
}

/**
 * Get or create a Stripe customer for a partner.
 */
export async function getOrCreateCustomer(
  partnerId: string,
  partnerName: string,
  email?: string,
): Promise<string> {
  // Search by metadata first
  const existing = await stripe.customers.search({
    query: `metadata["sitelaunch_partner_id"]:"${partnerId}"`,
  });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({
    name: partnerName,
    email: email ?? undefined,
    metadata: { sitelaunch_partner_id: partnerId },
  });

  return customer.id;
}
