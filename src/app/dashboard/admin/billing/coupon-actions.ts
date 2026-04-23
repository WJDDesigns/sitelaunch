"use server";

import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

interface CouponInput {
  code: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  expiresAt?: string;
  maxRedemptions?: number;
}

export async function createCouponAction(input: CouponInput) {
  await requireSuperadmin();

  const validTypes = ["percentage", "fixed"] as const;
  if (!validTypes.includes(input.type as (typeof validTypes)[number])) {
    throw new Error("Invalid coupon type. Must be 'percentage' or 'fixed'.");
  }

  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("Coupon code is required.");
  if (input.value <= 0) throw new Error("Discount value must be positive.");
  if (input.type === "percentage" && input.value > 100) {
    throw new Error("Percentage discount cannot exceed 100%.");
  }

  const admin = createAdminClient();

  // Check for duplicates
  const { data: existing } = await admin
    .from("coupons")
    .select("id")
    .ilike("code", code)
    .maybeSingle();

  if (existing) throw new Error("A coupon with this code already exists.");

  // Create Stripe coupon -- required for checkout to work
  let stripeCouponId: string;
  try {
    const stripeCoupon = await stripe.coupons.create({
      ...(input.type === "percentage"
        ? { percent_off: input.value }
        : { amount_off: input.value, currency: "usd" }),
      duration: "once",
      name: code,
      ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
      ...(input.expiresAt
        ? { redeem_by: Math.floor(new Date(input.expiresAt).getTime() / 1000) }
        : {}),
      metadata: { linqme_code: code },
    });
    stripeCouponId = stripeCoupon.id;
  } catch (err) {
    console.error("[billing] Failed to create Stripe coupon:", err);
    const msg = err instanceof Error ? err.message : "Unknown Stripe error";
    throw new Error(`Failed to create coupon in Stripe: ${msg}`);
  }

  await admin.from("coupons").insert({
    code,
    description: input.description || null,
    type: input.type,
    value: input.value,
    expires_at: input.expiresAt || null,
    max_redemptions: input.maxRedemptions || null,
    stripe_coupon_id: stripeCouponId,
    is_active: true,
  });

  revalidatePath("/dashboard/admin/billing/coupons");
  return { success: true };
}

export async function toggleCouponAction(couponId: string, isActive: boolean) {
  await requireSuperadmin();
  const admin = createAdminClient();

  await admin
    .from("coupons")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", couponId);

  revalidatePath("/dashboard/admin/billing/coupons");
  return { success: true };
}

export async function deleteCouponAction(couponId: string) {
  await requireSuperadmin();
  const admin = createAdminClient();

  // Get Stripe coupon ID before deleting
  const { data: coupon } = await admin
    .from("coupons")
    .select("stripe_coupon_id")
    .eq("id", couponId)
    .maybeSingle();

  // Delete from Stripe
  if (coupon?.stripe_coupon_id) {
    try {
      await stripe.coupons.del(coupon.stripe_coupon_id);
    } catch {
      // Stripe coupon may already be deleted
    }
  }

  await admin.from("coupons").delete().eq("id", couponId);

  revalidatePath("/dashboard/admin/billing/coupons");
  return { success: true };
}
