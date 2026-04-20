"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminPartnersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Partners error"
      message="Something went wrong loading partners. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
