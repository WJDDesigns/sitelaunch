"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminAnalyticsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Analytics error"
      message="Something went wrong loading analytics. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
