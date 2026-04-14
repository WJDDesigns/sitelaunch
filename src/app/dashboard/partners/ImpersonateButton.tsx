"use client";

import { useTransition } from "react";
import { startImpersonation } from "./impersonate-actions";

interface Props {
  partnerId: string;
  size?: "sm" | "md";
}

export default function ImpersonateButton({ partnerId, size = "sm" }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await startImpersonation(partnerId);
    });
  }

  if (size === "md") {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-amber-400 border border-amber-500/20 rounded-lg bg-amber-500/5 hover:bg-amber-500/15 disabled:opacity-50 transition-all"
      >
        <i className="fa-solid fa-user-secret text-xs" />
        {pending ? "Switching..." : "Login as customer"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Login as this customer"
      className="text-xs font-bold text-amber-400/70 hover:text-amber-400 disabled:opacity-50 transition-colors"
    >
      <i className="fa-solid fa-user-secret" />
    </button>
  );
}
