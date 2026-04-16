"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function SubmissionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Submissions error"
      message="Something went wrong loading submissions. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
