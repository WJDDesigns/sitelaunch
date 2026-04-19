"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function InsightsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Insights error"
      message="Something went wrong loading insights. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
