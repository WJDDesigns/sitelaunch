"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function PartnerDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Partner detail error"
      message="Something went wrong loading this partner. Your data is safe. Try refreshing the page."
      backHref="/dashboard/partners"
      backLabel="Back to Partners"
    />
  );
}
