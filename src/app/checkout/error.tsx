"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function CheckoutError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Checkout error"
      message="Something went wrong loading checkout. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
