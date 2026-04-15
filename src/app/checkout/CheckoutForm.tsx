"use client";

import { useState, useTransition } from "react";
import type { Plan } from "@/lib/plans";
import { validateCouponAction, createCheckoutSessionAction } from "./actions";

interface Props {
  plans: Plan[];
  defaultPlan?: string;
}

export default function CheckoutForm({ plans, defaultPlan }: Props) {
  const [selectedPlan, setSelectedPlan] = useState(
    defaultPlan && plans.find((p) => p.slug === defaultPlan)
      ? defaultPlan
      : plans[0]?.slug ?? "",
  );
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{
    valid: boolean;
    message: string;
    discountLabel?: string;
    discountCents?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isValidating, startValidation] = useTransition();

  const activePlan = plans.find((p) => p.slug === selectedPlan);

  function handleValidateCoupon() {
    if (!couponCode.trim()) return;
    setCouponStatus(null);
    startValidation(async () => {
      const result = await validateCouponAction(couponCode.trim(), selectedPlan);
      setCouponStatus(result);
    });
  }

  function handleRemoveCoupon() {
    setCouponCode("");
    setCouponStatus(null);
  }

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction(
        selectedPlan,
        couponStatus?.valid ? couponCode.trim() : undefined,
      );
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  const monthlyPrice = activePlan?.priceMonthly ?? 0;
  const discount = couponStatus?.valid ? (couponStatus.discountCents ?? 0) : 0;
  const finalPrice = Math.max(0, monthlyPrice - discount);

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-4">
        <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
          Select Plan
        </h2>
        <div className="grid gap-3">
          {plans.map((plan) => (
            <button
              key={plan.slug}
              onClick={() => {
                setSelectedPlan(plan.slug);
                setCouponStatus(null);
              }}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                selectedPlan === plan.slug
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                  : "border-outline-variant/15 hover:border-outline-variant/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlan === plan.slug
                        ? "border-primary bg-primary"
                        : "border-outline-variant/30"
                    }`}
                  >
                    {selectedPlan === plan.slug && (
                      <div className="w-1.5 h-1.5 rounded-full bg-on-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-on-surface">{plan.name}</span>
                    {plan.highlight && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        Popular
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-on-surface">
                  ${(plan.priceMonthly / 100).toFixed(0)}
                  <span className="text-xs text-on-surface-variant/60 font-normal">/mo</span>
                </span>
              </div>
              <div className="ml-7 mt-1.5">
                <p className="text-xs text-on-surface-variant/60">
                  {plan.submissionsMonthlyLimit
                    ? `${plan.submissionsMonthlyLimit} submissions/month`
                    : "Unlimited submissions"}{" "}
                  — {plan.features.slice(0, 3).join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Coupon Input */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-4">
        <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
          Coupon Code
        </h2>

        {couponStatus?.valid ? (
          <div className="flex items-center justify-between rounded-xl border border-tertiary/20 bg-tertiary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-tag text-tertiary text-sm" />
              <span className="text-sm font-medium text-tertiary">
                {couponCode.toUpperCase()}
              </span>
              <span className="text-xs text-on-surface-variant/60">
                — {couponStatus.discountLabel}
              </span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-on-surface-variant/60 hover:text-error transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponStatus(null);
              }}
              placeholder="Enter coupon code"
              className="flex-1 rounded-xl border border-outline-variant/15 bg-surface-container px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all font-mono tracking-wide"
              onKeyDown={(e) => e.key === "Enter" && handleValidateCoupon()}
            />
            <button
              onClick={handleValidateCoupon}
              disabled={!couponCode.trim() || isValidating}
              className="rounded-xl border border-outline-variant/15 bg-surface-container px-4 py-2.5 text-sm font-medium text-on-surface hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
            >
              {isValidating ? (
                <i className="fa-solid fa-spinner fa-spin text-xs" />
              ) : (
                "Apply"
              )}
            </button>
          </div>
        )}

        {couponStatus && !couponStatus.valid && (
          <p className="text-xs text-error">
            <i className="fa-solid fa-circle-exclamation mr-1" />
            {couponStatus.message}
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-3">
        <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
          Summary
        </h2>

        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant/80">{activePlan?.name} — Monthly</span>
          <span className="text-on-surface font-medium">
            ${(monthlyPrice / 100).toFixed(2)}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-tertiary">
              <i className="fa-solid fa-tag text-xs mr-1" />
              Coupon ({couponStatus?.discountLabel})
            </span>
            <span className="text-tertiary font-medium">
              -${(discount / 100).toFixed(2)}
            </span>
          </div>
        )}

        <div className="border-t border-outline-variant/10 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-on-surface">First month total</span>
          <span className="text-lg font-bold text-on-surface">
            ${(finalPrice / 100).toFixed(2)}
          </span>
        </div>

        <p className="text-[11px] text-on-surface-variant/40">
          {discount > 0
            ? `Then $${(monthlyPrice / 100).toFixed(2)}/month after. Cancel anytime.`
            : "Billed monthly. Cancel anytime."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {error}
        </div>
      )}

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        disabled={isPending || !selectedPlan}
        className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
      >
        {isPending ? (
          <>
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            Redirecting to Stripe…
          </>
        ) : (
          <>
            <i className="fa-solid fa-lock text-xs mr-2" />
            Continue to Payment
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-on-surface-variant/40">
        Secure checkout powered by Stripe. Your payment info is never stored on our servers.
      </p>
    </div>
  );
}
