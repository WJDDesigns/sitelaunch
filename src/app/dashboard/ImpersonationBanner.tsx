"use client";

import { useTransition } from "react";
import { stopImpersonation } from "./partners/impersonate-actions";

interface Props {
  partnerName: string;
}

export default function ImpersonationBanner({ partnerName }: Props) {
  const [pending, startTransition] = useTransition();

  function handleStop() {
    startTransition(async () => {
      await stopImpersonation();
    });
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-black px-4 py-2 flex items-center justify-center gap-3 text-sm font-bold shadow-lg">
      <i className="fa-solid fa-user-secret text-xs" />
      <span>
        Viewing as <span className="underline decoration-2 underline-offset-2">{partnerName}</span>
      </span>
      <button
        onClick={handleStop}
        disabled={pending}
        className="ml-2 px-3 py-1 bg-black/20 hover:bg-black/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
      >
        {pending ? "Exiting..." : "Exit"}
      </button>
    </div>
  );
}
