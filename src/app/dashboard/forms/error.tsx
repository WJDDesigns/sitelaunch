"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function FormsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Forms error"
      message="Something went wrong loading forms. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
