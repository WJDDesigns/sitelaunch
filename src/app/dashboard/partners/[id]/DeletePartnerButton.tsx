"use client";

import { useState, useTransition } from "react";

interface Props {
  partnerId: string;
  partnerName: string;
  deleteAction: (partnerId: string) => Promise<void>;
}

export default function DeletePartnerButton({ partnerId, partnerName, deleteAction }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-600 hover:text-red-700"
      >
        Delete partner
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-700">Delete {partnerName}?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deleteAction(partnerId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Delete failed");
            }
          })
        }
        className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-slate-500 hover:text-slate-900"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
