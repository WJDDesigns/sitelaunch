"use client";

import { useState, useTransition } from "react";
import type { Coupon } from "@/lib/coupons";
import {
  createCouponAction,
  toggleCouponAction,
  deleteCouponAction,
} from "../coupon-actions";

export default function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");

  function resetForm() {
    setCode("");
    setDescription("");
    setType("percentage");
    setValue("");
    setExpiresAt("");
    setMaxRedemptions("");
    setError(null);
  }

  function handleCreate() {
    setError(null);
    setSuccess(null);

    const numValue = Number(value);
    if (!code.trim()) return setError("Code is required.");
    if (!numValue || numValue <= 0) return setError("Value must be positive.");

    startTransition(async () => {
      try {
        await createCouponAction({
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          type,
          value: numValue,
          expiresAt: expiresAt || undefined,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        });
        setSuccess(`Coupon "${code.toUpperCase()}" created!`);
        resetForm();
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create coupon.");
      }
    });
  }

  function handleToggle(couponId: string, newState: boolean) {
    startTransition(async () => {
      try {
        await toggleCouponAction(couponId, newState);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update coupon.");
      }
    });
  }

  function handleDelete(couponId: string, couponCode: string) {
    if (!confirm(`Delete coupon "${couponCode}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteCouponAction(couponId);
        setSuccess(`Coupon "${couponCode}" deleted.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete coupon.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
          <i className="fa-solid fa-circle-check mr-2" />
          {success}
        </div>
      )}

      {/* Create Button / Form */}
      {!showForm ? (
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccess(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-md hover:brightness-110 transition-all"
        >
          <i className="fa-solid fa-plus text-xs" />
          New Coupon
        </button>
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface">Create Coupon</h2>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1">
                Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="LAUNCH20"
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1">
                Discount Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "percentage" | "fixed")}
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1">
                {type === "percentage" ? "Percentage (1–100)" : "Amount (cents)"}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "20" : "2000"}
                min="1"
                max={type === "percentage" ? "100" : undefined}
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
              {type === "fixed" && value && (
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  = ${(Number(value) / 100).toFixed(2)} off
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Launch promotion"
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Expires At */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1">
                Expires (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Max Redemptions */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1">
                Max Redemptions (optional)
              </label>
              <input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
                min="1"
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-md hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isPending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" />
                Creating…
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-xs" />
                Create Coupon
              </>
            )}
          </button>
        </div>
      )}

      {/* Coupons Table */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            All Coupons ({coupons.length})
          </h2>
        </div>

        {coupons.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <i className="fa-solid fa-ticket text-3xl text-on-surface-variant/20 mb-3" />
            <p className="text-sm text-on-surface-variant/60">No coupons yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/5">
            {coupons.map((coupon) => {
              const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
              const isMaxed = coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions;
              const effectivelyActive = coupon.isActive && !isExpired && !isMaxed;

              return (
                <div key={coupon.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold text-on-surface font-mono tracking-wide">
                        {coupon.code}
                      </code>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          effectivelyActive
                            ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                            : "bg-surface-container-high text-on-surface-variant/60 border-outline-variant/15"
                        }`}
                      >
                        {effectivelyActive ? "Active" : isExpired ? "Expired" : isMaxed ? "Maxed" : "Inactive"}
                      </span>
                      {coupon.stripeCouponId && (
                        <span className="text-[10px] text-on-surface-variant/40">
                          <i className="fa-brands fa-stripe text-sm" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-on-surface-variant/60">
                        {coupon.type === "percentage"
                          ? `${coupon.value}% off`
                          : `$${(coupon.value / 100).toFixed(2)} off`}
                      </span>
                      {coupon.description && (
                        <span className="text-xs text-on-surface-variant/40">
                          · {coupon.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-on-surface-variant/40">
                        Used: {coupon.timesRedeemed}
                        {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
                      </span>
                      {coupon.expiresAt && (
                        <span className="text-[11px] text-on-surface-variant/40">
                          {isExpired ? "Expired" : "Expires"}:{" "}
                          {new Date(coupon.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(coupon.id, !coupon.isActive)}
                      disabled={isPending}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                        coupon.isActive
                          ? "border-outline-variant/15 text-on-surface-variant/60 hover:text-error hover:border-error/30"
                          : "border-tertiary/30 text-tertiary hover:bg-tertiary/10"
                      }`}
                    >
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id, coupon.code)}
                      disabled={isPending}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-outline-variant/15 text-on-surface-variant/60 hover:text-error hover:border-error/30 transition-all disabled:opacity-50"
                    >
                      <i className="fa-solid fa-trash text-[10px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
