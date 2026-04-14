"use client";

import { useTransition } from "react";
import { createCheckoutAction } from "./actions";
import type { BillingTier } from "@/lib/stripe";

interface Props {
  tier: BillingTier;
  label: string;
  highlight?: boolean;
}

export default function UpgradeButton({ tier, label, highlight }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await createCheckoutAction(tier);
    });
  }

  return (
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
        <>{label} <i className="fa-solid fa-arrow-right text-[10px] ml-1" /></>
      )}
    </button>
  );
}
