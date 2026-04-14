"use client";

import { useState, useTransition } from "react";
import { adminRefundAction } from "./actions";

interface Props {
  invoiceId: string;
  amount: number;
}

export default function RefundButton({ invoiceId, amount }: Props) {
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function handleRefund() {
    setShowConfirm(false);
    setMsg(null);
    startTransition(async () => {
      try {
        await adminRefundAction(invoiceId);
        setMsg("Refunded");
      } catch (err) {
        setMsg(`Error: ${err instanceof Error ? err.message : "Failed"}`);
      }
    });
  }

  if (msg === "Refunded") {
    return <span className="text-[10px] text-tertiary font-bold">Refunded</span>;
  }

  return (
    <>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={pending}
          className="text-[10px] text-error/60 hover:text-error font-bold transition-colors disabled:opacity-50"
        >
          Refund
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefund}
            disabled={pending}
            className="text-[10px] text-error font-bold disabled:opacity-50"
          >
            {pending ? "..." : `Refund $${(amount / 100).toFixed(2)}?`}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-[10px] text-on-surface-variant"
          >
            No
          </button>
        </div>
      )}
      {msg && msg.startsWith("Error") && (
        <span className="text-[10px] text-error">{msg}</span>
      )}
    </>
  );
}
