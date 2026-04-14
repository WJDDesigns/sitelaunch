"use client";

import { useState, useTransition } from "react";
import { adminChangePlanAction } from "./actions";
import type { BillingTier } from "@/lib/stripe";

interface Props {
  partnerId: string;
  partnerName: string;
  currentTier: string;
}

const TIERS: { value: BillingTier; label: string }[] = [
  { value: "free", label: "Free (Starlink)" },
  { value: "pro", label: "Pro (Supernova) — $149/mo" },
  { value: "enterprise", label: "Enterprise (Galactic) — $399/mo" },
];

export default function AdminPlanChanger({ partnerId, partnerName, currentTier }: Props) {
  const [selected, setSelected] = useState<BillingTier>(
    currentTier === "paid" || currentTier === "unlimited" ? "pro" : currentTier as BillingTier
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSave() {
    setShowConfirm(false);
    setMsg(null);
    startTransition(async () => {
      try {
        await adminChangePlanAction(partnerId, selected);
        setMsg("Plan updated successfully!");
      } catch (err) {
        setMsg(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    });
  }

  const mappedCurrent = currentTier === "paid" || currentTier === "unlimited" ? "pro" : currentTier;
  const hasChanged = selected !== mappedCurrent;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value as BillingTier); setMsg(null); }}
        disabled={pending}
        className="px-3 py-2 text-xs bg-surface-container-lowest border-0 rounded-lg text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {hasChanged && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={pending}
          className="px-3 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          Apply Change
        </button>
      )}

      {showConfirm && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400">
            Change {partnerName} to {TIERS.find(t => t.value === selected)?.label}?
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
