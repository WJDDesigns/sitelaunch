import { createAdminClient } from "@/lib/supabase/admin";

export interface Plan {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  submissionsMonthlyLimit: number | null;
  features: string[];
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  highlight: boolean;
  sortOrder: number;
}

/**
 * Fetch all active plans from the database, sorted by sort_order.
 * Falls back to hardcoded defaults if the plans table doesn't exist yet.
 */
export async function getPlans(): Promise<Plan[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return getDefaultPlans();
    }

    return data.map(mapDbPlan);
  } catch {
    return getDefaultPlans();
  }
}

/**
 * Fetch ALL plans (including inactive) for admin management.
 */
export async function getAllPlans(): Promise<Plan[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return getDefaultPlans();
  return data.map(mapDbPlan);
}

/**
 * Get a single plan by slug.
 */
export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plans")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return data ? mapDbPlan(data) : null;
}

function mapDbPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    priceMonthly: row.price_monthly as number,
    submissionsMonthlyLimit: row.submissions_monthly_limit as number | null,
    features: (row.features as string[]) ?? [],
    stripeProductId: row.stripe_product_id as string | null,
    stripePriceId: row.stripe_price_id as string | null,
    isActive: row.is_active as boolean,
    highlight: row.highlight as boolean,
    sortOrder: row.sort_order as number,
  };
}

function getDefaultPlans(): Plan[] {
  return [
    {
      id: "default-free",
      slug: "free",
      name: "Starlink",
      priceMonthly: 0,
      submissionsMonthlyLimit: 1,
      features: ["Your own branded workspace", "Unlimited form fields", "File uploads", "1 submission / month"],
      stripeProductId: null,
      stripePriceId: null,
      isActive: true,
      highlight: false,
      sortOrder: 0,
    },
    {
      id: "default-pro",
      slug: "pro",
      name: "Supernova",
      priceMonthly: 14900,
      submissionsMonthlyLimit: null,
      features: ["Everything in Starlink", "Unlimited submissions", "Custom domain", "Branded emails", "Full white-labeling"],
      stripeProductId: null,
      stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
      isActive: true,
      highlight: true,
      sortOrder: 1,
    },
    {
      id: "default-enterprise",
      slug: "enterprise",
      name: "Galactic",
      priceMonthly: 39900,
      submissionsMonthlyLimit: null,
      features: ["Everything in Supernova", "Priority support", "API access (coming)", "Dedicated success contact"],
      stripeProductId: null,
      stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
      isActive: true,
      highlight: false,
      sortOrder: 2,
    },
  ];
}
