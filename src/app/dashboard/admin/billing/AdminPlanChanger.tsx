"use client";

import { useState, useTransition } from "react";
import { adminChangePlanAction } from "./actions";
import type { BillingTier } from "@/lib/stripe";

interface PlanOption {
  slug: string;
  name: string;
  priceMonthly: number;
}

interface Props {
  partnerId: string;
  partnerName: string;
  currentTier: string;
  plans: PlanOption[];
}

export default function AdminPlanChanger({ partnerId, partnerName, currentTier, plans }: Props) {
  // Map legacy tier names
  const mappedCurrent = currentTier === "paid" || currentTier === "unlimited" || currentTier === "pro" ? "nova" : currentTier === "enterprise" ? "supernova" : currentTier;
  const [selected, setSelected] = useState(mappedCurrent);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasChanged = selected !== mappedCurrent;

  function handleSave() {
    setShowConfirm(false);
    setMsg(null);
    startTransition(async () => {
      try {
        await adminChangePlanAction(partnerId, selected as BillingTier);
        setMsg("Plan updated!");
      } catch (err) {
        setMsg(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    });
  }

  const selectedPlan = plans.find((p) => p.slug === selected);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setMsg(null); }}
        disabled={pending}
        className="px-3 py-2 text-xs bg-surface-container-lowest border-0 rounded-lg text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
      >
        {plans.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}{p.priceMonthly > 0 ? ` · $${(p.priceMonthly / 100).toFixed(0)}/mo` : ""}
          </option>
        ))}
      </select>

      {hasChanged && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={pending}
          className="px-3 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          Apply
        </button>
      )}

      {showConfirm && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400">
            Change {partnerName} to {selectedPlan?.name}?
          </span>
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-3 py-1.5 text-xs font-bold bg-error text-on-primary rounded-lg disabled:opacity-50"
          >
            {pending ? "Saving..." : "Confirm"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1.5 text-xs text-on-surface-variant border border-outline-variant/20 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}

      {msg && (
        <span className={`text-xs font-medium ${msg.startsWith("Error") ? "text-error" : "text-tertiary"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
