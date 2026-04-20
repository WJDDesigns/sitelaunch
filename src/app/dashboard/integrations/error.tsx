"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function IntegrationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Integrations error"
      message="Something went wrong loading integrations. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
