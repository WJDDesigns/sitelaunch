"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function BillingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Billing error"
      message="Something went wrong loading billing. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
