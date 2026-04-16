"use client";

import { useState, useTransition } from "react";
import type { Plan } from "@/lib/plans";
import type { PartnerProfile } from "./page";
import {
  validateCouponAction,
  createCheckoutSessionAction,
  saveBusinessDetailsAction,
} from "./actions";

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300";

const SELECT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300 appearance-none";

interface Props {
  plans: Plan[];
  defaultPlan?: string;
  partnerProfile: PartnerProfile | null;
  partnerId: string | null;
}

export default function CheckoutForm({ plans, defaultPlan, partnerProfile, partnerId }: Props) {
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

  // Business details state — pre-filled from existing data
  const [biz, setBiz] = useState({
    phone: partnerProfile?.phone ?? "",
    website: partnerProfile?.website ?? "",
    industry: partnerProfile?.industry ?? "",
    billing_address_line1: partnerProfile?.billing_address_line1 ?? "",
    billing_address_line2: partnerProfile?.billing_address_line2 ?? "",
    billing_city: partnerProfile?.billing_city ?? "",
    billing_state: partnerProfile?.billing_state ?? "",
    billing_zip: partnerProfile?.billing_zip ?? "",
    billing_country: partnerProfile?.billing_country ?? "US",
    team_size: partnerProfile?.team_size ?? "",
    expected_monthly_clients: partnerProfile?.expected_monthly_clients ?? "",
    referral_source: partnerProfile?.referral_source ?? "",
    tax_id: partnerProfile?.tax_id ?? "",
  });
  const [bizSaved, setBizSaved] = useState(false);
  const [isSavingBiz, startSavingBiz] = useTransition();

  function updateBiz(field: string, value: string) {
    setBiz((prev) => ({ ...prev, [field]: value }));
    setBizSaved(false);
  }

  // Check if business details have the required fields
  const bizComplete = Boolean(biz.phone && biz.billing_address_line1 && biz.billing_city && biz.billing_state && biz.billing_zip);

  function handleSaveBiz() {
    if (!partnerId) return;
    if (!biz.phone) {
      setError("Phone number is required.");
      return;
    }
    setError(null);
    startSavingBiz(async () => {
      const result = await saveBusinessDetailsAction(partnerId, biz);
      if (result.ok) {
        setBizSaved(true);
      } else {
        setError(result.error ?? "Failed to save business details.");
      }
    });
  }

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
    if (!bizComplete && !bizSaved) {
      setError("Please fill in your business details and save them before proceeding.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // Save biz details if not already saved
      if (partnerId && !bizSaved) {
        const saveResult = await saveBusinessDetailsAction(partnerId, biz);
        if (!saveResult.ok) {
          setError(saveResult.error ?? "Failed to save business details.");
          return;
        }
      }

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
      {/* ── Business Details ── */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
            Business Details
          </h2>
          {bizSaved && (
            <span className="text-[10px] font-semibold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
              <i className="fa-solid fa-check text-[8px] mr-1" /> Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
              Phone <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              autoComplete="tel"
              className={`${INPUT_CLS} mt-1`}
              placeholder="(555) 123-4567"
              value={biz.phone}
              onChange={(e) => updateBiz("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Website</label>
            <input
              type="url"
              autoComplete="url"
              className={`${INPUT_CLS} mt-1`}
              placeholder="https://youragency.com"
              value={biz.website}
              onChange={(e) => updateBiz("website", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Industry</label>
            <select className={`${SELECT_CLS} mt-1`} value={biz.industry} onChange={(e) => updateBiz("industry", e.target.value)}>
              <option value="">Select industry</option>
              <option value="web_design">Web Design & Development</option>
              <option value="marketing">Marketing & Advertising</option>
              <option value="creative">Creative & Design Studio</option>
              <option value="consulting">Consulting</option>
              <option value="real_estate">Real Estate</option>
              <option value="healthcare">Healthcare</option>
              <option value="legal">Legal</option>
              <option value="finance">Finance & Accounting</option>
              <option value="ecommerce">E-Commerce</option>
              <option value="saas">SaaS / Technology</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Tax ID / EIN</label>
            <input className={`${INPUT_CLS} mt-1`} placeholder="e.g. 12-3456789" value={biz.tax_id} onChange={(e) => updateBiz("tax_id", e.target.value)} />
          </div>
        </div>

        {/* Billing address */}
        <div>
          <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            Billing Address <span className="text-error">*</span>
          </label>
          <div className="space-y-2 mt-1">
            <input autoComplete="address-line1" aria-label="Street address" className={INPUT_CLS} placeholder="Street address" value={biz.billing_address_line1} onChange={(e) => updateBiz("billing_address_line1", e.target.value)} />
            <input autoComplete="address-line2" aria-label="Apartment, suite, or unit" className={INPUT_CLS} placeholder="Apt, suite, unit (optional)" value={biz.billing_address_line2} onChange={(e) => updateBiz("billing_address_line2", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input autoComplete="address-level2" aria-label="City" className={INPUT_CLS} placeholder="City" value={biz.billing_city} onChange={(e) => updateBiz("billing_city", e.target.value)} />
              <input autoComplete="address-level1" aria-label="State" className={INPUT_CLS} placeholder="State" value={biz.billing_state} onChange={(e) => updateBiz("billing_state", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input autoComplete="postal-code" aria-label="ZIP code" className={INPUT_CLS} placeholder="ZIP code" value={biz.billing_zip} onChange={(e) => updateBiz("billing_zip", e.target.value)} />
              <select autoComplete="country" aria-label="Country" className={SELECT_CLS} value={biz.billing_country} onChange={(e) => updateBiz("billing_country", e.target.value)}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Usage info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Team Size</label>
            <select className={`${SELECT_CLS} mt-1`} value={biz.team_size} onChange={(e) => updateBiz("team_size", e.target.value)}>
              <option value="">Select</option>
              <option value="just_me">Just me</option>
              <option value="2-5">2–5</option>
              <option value="6-15">6–15</option>
              <option value="16-50">16–50</option>
              <option value="50+">50+</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Clients / Mo</label>
            <select className={`${SELECT_CLS} mt-1`} value={biz.expected_monthly_clients} onChange={(e) => updateBiz("expected_monthly_clients", e.target.value)}>
              <option value="">Select</option>
              <option value="1-5">1–5</option>
              <option value="6-15">6–15</option>
              <option value="16-50">16–50</option>
              <option value="50+">50+</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Found Us Via</label>
            <select className={`${SELECT_CLS} mt-1`} value={biz.referral_source} onChange={(e) => updateBiz("referral_source", e.target.value)}>
              <option value="">Select</option>
              <option value="google">Google</option>
              <option value="social_media">Social Media</option>
              <option value="referral">Referral</option>
              <option value="blog">Blog / Article</option>
              <option value="youtube">YouTube</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {!bizSaved && (
          <button
            type="button"
            onClick={handleSaveBiz}
            disabled={isSavingBiz || !biz.phone}
            className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
          >
            {isSavingBiz ? (
              <><i className="fa-solid fa-spinner fa-spin mr-2 text-xs" />Saving...</>
            ) : (
              <><i className="fa-solid fa-floppy-disk mr-2 text-xs" />Save Business Details</>
            )}
          </button>
        )}
      </div>

      {/* ── Plan Selection ── */}
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
                  · {plan.features.slice(0, 3).join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Coupon Input ── */}
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
                · {couponStatus.discountLabel}
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

      {/* ── Order Summary ── */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-3">
        <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
          Summary
        </h2>

        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant/80">{activePlan?.name} · Monthly</span>
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
