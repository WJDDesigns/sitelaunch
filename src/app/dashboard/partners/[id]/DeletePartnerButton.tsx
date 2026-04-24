"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  partnerId: string;
  partnerName: string;
  deleteAction: (partnerId: string) => Promise<void>;
  label?: string;
  redirectTo?: string;
}

export default function DeletePartnerButton({ partnerId, partnerName, deleteAction, label, redirectTo }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-4 py-2 bg-error-container/20 text-error text-xs font-bold rounded-lg border border-error/20 hover:bg-error-container/40 transition-all"
      >
        {label || "Delete partner"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-on-surface-variant">Delete {partnerName}?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deleteAction(partnerId);
              router.replace(redirectTo || "/dashboard/partners");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Delete failed");
            }
          })
        }
        className="px-3 py-1.5 bg-error text-on-error text-xs font-bold rounded-lg disabled:opacity-50 transition-all"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
