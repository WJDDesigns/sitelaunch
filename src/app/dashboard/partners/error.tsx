"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function PartnersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Partners error"
      message="Something went wrong loading partners. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
