"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function DocsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Documentation error"
      message="Something went wrong loading documentation. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
