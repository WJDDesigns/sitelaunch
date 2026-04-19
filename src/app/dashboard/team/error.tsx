"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function TeamError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Team error"
      message="Something went wrong loading team members. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
