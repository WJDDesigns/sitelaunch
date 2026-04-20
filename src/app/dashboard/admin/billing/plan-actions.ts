"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

/**
 * Create or update a plan. Auto-syncs with Stripe (creates/updates product & price).
 */
export async function savePlanAction(formData: FormData) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const planId = formData.get("plan_id") as string | null;
  const slug = (formData.get("slug") as string).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const name = (formData.get("name") as string).trim();
  const priceMonthly = Math.round(parseFloat(formData.get("price_monthly") as string) * 100); // dollars → cents
  const submissionsLimit = formData.get("submissions_limit") as string;
  const featuresRaw = (formData.get("features") as string).trim();
  const isActive = formData.get("is_active") === "on";
  const highlight = formData.get("highlight") === "on";
  const sortOrder = parseInt(formData.get("sort_order") as string) || 0;

  const features = featuresRaw
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const submissionsMonthlyLimit = submissionsLimit === "" || submissionsLimit === "unlimited"
    ? null
    : parseInt(submissionsLimit) || null;

  // ── Stripe sync ──
  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  // Only sync paid plans to Stripe
  if (priceMonthly > 0) {
    try {
      // Check if we have an existing plan record with Stripe IDs
      if (planId) {
        const { data: existing } = await admin
          .from("plans")
          .select("stripe_product_id, stripe_price_id, price_monthly")
          .eq("id", planId)
          .maybeSingle();

        stripeProductId = existing?.stripe_product_id ?? null;
        stripePriceId = existing?.stripe_price_id ?? null;

        // If product exists, update it
        if (stripeProductId) {
          await stripe.products.update(stripeProductId, {
            name: `linqme ${name}`,
            metadata: { linqme_tier: slug },
          });

          // If price changed, create a new price and archive the old one
          if (existing?.price_monthly !== priceMonthly) {
            const newPrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: priceMonthly,
              currency: "usd",
              recurring: { interval: "month" },
              metadata: { linqme_tier: slug },
            });
            stripePriceId = newPrice.id;

            // Archive old price
            if (existing?.stripe_price_id) {
              try {
                await stripe.prices.update(existing.stripe_price_id, { active: false });
              } catch {
                // Old price may already be archived
              }
            }
          }
        }
      }

      // If no Stripe product yet, create one
      if (!stripeProductId) {
        const product = await stripe.products.create({
          name: `linqme ${name}`,
          metadata: { linqme_tier: slug },
        });
        stripeProductId = product.id;

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceMonthly,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: { linqme_tier: slug },
        });
        stripePriceId = price.id;
      }
    } catch (err) {
      console.error("[billing] Stripe sync failed:", err);
      // Continue saving to DB even if Stripe fails
    }
  }

  const planData = {
    slug,
    name,
    price_monthly: priceMonthly,
    submissions_monthly_limit: submissionsMonthlyLimit,
    features,
    stripe_product_id: stripeProductId,
    stripe_price_id: stripePriceId,
    is_active: isActive,
    highlight,
    sort_order: sortOrder,
  };

  if (planId) {
    await admin.from("plans").update(planData).eq("id", planId);
  } else {
    await admin.from("plans").insert(planData);
  }

  revalidatePath("/dashboard/admin/billing");
  revalidatePath("/dashboard/billing");
}

/**
 * Toggle a plan's active state (soft delete).
 */
export async function togglePlanActiveAction(planId: string) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("plans")
    .select("is_active, stripe_product_id")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) throw new Error("Plan not found");

  const newActive = !plan.is_active;

  await admin.from("plans").update({ is_active: newActive }).eq("id", planId);

  // Sync product active state in Stripe
  if (plan.stripe_product_id) {
    try {
      await stripe.products.update(plan.stripe_product_id, { active: newActive });
    } catch {
      // non-critical
    }
  }

  revalidatePath("/dashboard/admin/billing");
  revalidatePath("/dashboard/billing");
}

/**
 * Delete a plan permanently. Only allowed if no partners are on it.
 */
export async function deletePlanAction(planId: string) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("plans")
    .select("slug, stripe_product_id, stripe_price_id")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) throw new Error("Plan not found");

  // Prevent deleting the free plan
  if (plan.slug === "free") throw new Error("Cannot delete the free plan");

  // Check if any partners are on this plan
  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_tier", plan.slug)
    .in("status", ["active", "trialing"]);

  if ((count ?? 0) > 0) {
    throw new Error(`Cannot delete. ${count} active subscriptions are on this plan.`);
  }

  // Archive in Stripe
  if (plan.stripe_price_id) {
    try { await stripe.prices.update(plan.stripe_price_id, { active: false }); } catch { /* ok */ }
  }
  if (plan.stripe_product_id) {
    try { await stripe.products.update(plan.stripe_product_id, { active: false }); } catch { /* ok */ }
  }

  await admin.from("plans").delete().eq("id", planId);

  revalidatePath("/dashboard/admin/billing");
  revalidatePath("/dashboard/billing");
}
