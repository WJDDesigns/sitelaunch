"use client";

import { useTransition } from "react";
import { openCustomerPortalAction } from "./actions";

interface Props {
  hasSubscription: boolean;
}

export default function ManageSubscriptionButton({ hasSubscription }: Props) {
  const [pending, startTransition] = useTransition();

  if (!hasSubscription) return null;

  function handleClick() {
    startTransition(async () => {
      await openCustomerPortalAction();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-5 py-2.5 border border-outline-variant/30 text-on-surface-variant font-bold rounded-lg text-sm hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
    >
      {pending ? (
        <><i className="fa-solid fa-spinner fa-spin text-[10px] mr-1.5" /> Opening...</>
      ) : (
        <><i className="fa-solid fa-credit-card text-xs mr-2" />Manage Subscription</>
      )}
    </button>
  );
}
