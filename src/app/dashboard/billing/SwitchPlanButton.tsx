"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchPlanAction, validateBillingCouponAction } from "./actions";

interface Props {
  targetSlug: string;
  targetName?: string;
  currentPlanName?: string;
  label: string;
  highlight?: boolean;
  isDowngrade?: boolean;
}

export default function SwitchPlanButton({ targetSlug, targetName, currentPlanName, label, highlight, isDowngrade }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponValid, setCouponValid] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponLabel, setCouponLabel] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setValidating(true);
    setCouponMessage(null);
    try {
      const result = await validateBillingCouponAction(couponCode.trim(), targetSlug);
      setCouponValid(result.valid);
      setCouponMessage(result.message);
      if (result.valid && result.discountLabel) {
        setCouponLabel(result.discountLabel);
      }
    } catch {
      setCouponValid(false);
      setCouponMessage("Failed to validate coupon.");
    } finally {
      setValidating(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponCode("");
    setCouponValid(false);
    setCouponMessage(null);
    setCouponLabel(null);
  }

  function handleClick() {
    setShowConfirm(true);
  }

  function handleConfirm() {
    setShowConfirm(false);
    setError(null);
    startTransition(async () => {
      const result = await switchPlanAction(
        targetSlug,
        couponValid ? couponCode.trim() : undefined,
      );
      if (result.ok) {
        if (result.redirectUrl) {
          // Free-to-paid flow: redirect to Stripe checkout
          window.location.href = result.redirectUrl;
        } else {
          router.refresh();
        }
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Coupon toggle — only show for upgrades */}
      {!isDowngrade && !showCoupon && !couponValid && (
        <button
          type="button"
          onClick={() => setShowCoupon(true)}
          className="text-[10px] text-primary/70 hover:text-primary transition-colors w-full text-center"
        >
          <i className="fa-solid fa-tag text-[9px] mr-1" />
          Have a coupon?
        </button>
      )}

      {/* Coupon input */}
      {!isDowngrade && showCoupon && !couponValid && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => { setCouponCode(e.target.value); setCouponMessage(null); }}
            placeholder="Coupon code"
            className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary/50 focus:ring-0 outline-none transition-all"
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={validating || !couponCode.trim()}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 disabled:opacity-40 transition-all"
          >
            {validating ? <i className="fa-solid fa-spinner fa-spin" /> : "Apply"}
          </button>
        </div>
      )}

      {/* Coupon feedback */}
      {couponMessage && (
        <div className={`text-[10px] text-center ${couponValid ? "text-tertiary" : "text-error"}`}>
          {couponValid && <i className="fa-solid fa-check text-[9px] mr-1" />}
          {couponMessage}
          {couponValid && (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="ml-2 text-on-surface-variant/50 hover:text-error transition-colors"
            >
              <i className="fa-solid fa-xmark text-[9px]" />
            </button>
          )}
        </div>
      )}

      {/* Switch plan button */}
      <button
        onClick={handleClick}
        disabled={pending}
        className={`inline-block w-full text-center rounded-lg px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 ${
          isDowngrade
            ? "border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30"
            : highlight
            ? "bg-primary text-on-primary hover:shadow-[0_0_15px_rgba(192,193,255,0.4)]"
            : "border border-outline-variant/30 hover:bg-surface-variant/30"
        }`}
      >
        {pending ? (
          <><i className="fa-solid fa-spinner fa-spin text-[10px] mr-1.5" /> Switching...</>
        ) : (
          <>
            {label}
            {couponLabel && !isDowngrade && <span className="ml-1.5 opacity-70">({couponLabel})</span>}
            {isDowngrade ? (
              <i className="fa-solid fa-arrow-down text-[10px] ml-1" />
            ) : (
              <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
            )}
          </>
        )}
      </button>
      {error && (
        <p className="text-[10px] text-error mt-1 text-center">{error}</p>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-surface-container rounded-2xl border border-outline-variant/15 shadow-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDowngrade ? "bg-warning/10" : "bg-primary/10"}`}>
                <i className={`fa-solid ${isDowngrade ? "fa-arrow-down text-warning" : "fa-arrow-up text-primary"} text-sm`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">
                  {isDowngrade ? "Confirm downgrade" : "Confirm plan change"}
                </h3>
                <p className="text-[11px] text-on-surface-variant/60">
                  {currentPlanName ?? "Current"} → {targetName ?? targetSlug}
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
              {isDowngrade
                ? "You'll receive prorated credit for unused time on your current plan. The new plan takes effect immediately and some features may become unavailable."
                : "Your new plan takes effect immediately. You'll be charged the prorated difference for the rest of this billing period."}
              {couponLabel && (
                <span className="block mt-2 text-tertiary font-medium">
                  <i className="fa-solid fa-tag text-[10px] mr-1" />
                  Coupon applied: {couponLabel}
                </span>
              )}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  isDowngrade
                    ? "bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30"
                    : "bg-primary text-on-primary hover:shadow-[0_0_15px_rgba(105,108,248,0.3)]"
                }`}
              >
                {isDowngrade ? "Yes, downgrade" : "Yes, upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
