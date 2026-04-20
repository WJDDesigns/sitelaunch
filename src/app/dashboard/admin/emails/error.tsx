"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminEmailsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Emails error"
      message="Something went wrong loading emails. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
