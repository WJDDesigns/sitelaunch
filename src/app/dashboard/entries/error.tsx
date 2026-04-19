"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function EntriesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Entries error"
      message="Something went wrong loading entries. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
