"use client";

import { useState, useTransition } from "react";
import { createCheckoutAction, validateBillingCouponAction } from "./actions";

interface Props {
  tier: string;  // plan slug
  label: string;
  highlight?: boolean;
}

export default function UpgradeButton({ tier, label, highlight }: Props) {
  const [pending, startTransition] = useTransition();
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
      const result = await validateBillingCouponAction(couponCode.trim(), tier);
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

  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutAction(tier, couponValid ? couponCode.trim() : undefined);
      if (result.ok) {
        window.location.href = result.url;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Coupon toggle */}
      {!showCoupon && !couponValid && (
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
      {showCoupon && !couponValid && (
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

      {/* Error message */}
      {error && (
        <div className="text-[10px] text-error text-center px-2 py-1.5 bg-error/5 rounded-lg border border-error/10">
          {error}
        </div>
      )}

      {/* Upgrade button */}
      <button
        onClick={handleClick}
        disabled={pending}
        className={`inline-block w-full text-center rounded-lg px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 ${
          highlight
            ? "bg-primary text-on-primary hover:shadow-[0_0_15px_rgba(192,193,255,0.4)]"
            : "border border-outline-variant/30 hover:bg-surface-variant/30"
        }`}
      >
        {pending ? (
          <><i className="fa-solid fa-spinner fa-spin text-[10px] mr-1.5" /> Redirecting...</>
        ) : (
          <>
            {label}
            {couponLabel && <span className="ml-1.5 opacity-70">({couponLabel})</span>}
            <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
          </>
        )}
      </button>
    </div>
  );
}
