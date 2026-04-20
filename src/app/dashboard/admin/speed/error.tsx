"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminSpeedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Speed error"
      message="Something went wrong loading speed metrics. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
