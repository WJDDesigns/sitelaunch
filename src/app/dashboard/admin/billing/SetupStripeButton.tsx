"use client";

import { useState, useTransition } from "react";
import { adminSetupStripeAction } from "./actions";

export default function SetupStripeButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Record<string, string | null> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSetup() {
    setError(null);
    startTransition(async () => {
      try {
        const priceIds = await adminSetupStripeAction();
        setResult(priceIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up Stripe products");
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSetup}
        disabled={pending}
        className="px-4 py-2.5 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
      >
        {pending ? (
          <><i className="fa-solid fa-spinner fa-spin text-[10px] mr-1.5" /> Setting up...</>
        ) : (
          <><i className="fa-brands fa-stripe text-sm mr-1.5" /> Initialize Stripe Products</>
        )}
      </button>

      {error && (
        <p className="text-xs text-error">{error}</p>
      )}

      {result && (
        <div className="p-4 rounded-xl bg-surface-container-lowest text-xs font-mono space-y-1.5">
          <p className="text-on-surface-variant/60 mb-2">Add these to your .env.local:</p>
          <p className="text-on-surface">STRIPE_PRICE_PRO={result.pro ?? "(not created)"}</p>
          <p className="text-on-surface">STRIPE_PRICE_ENTERPRISE={result.enterprise ?? "(not created)"}</p>
        </div>
      )}
    </div>
  );
}
