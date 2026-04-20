"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminActivityError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Activity error"
      message="Something went wrong loading activity. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
