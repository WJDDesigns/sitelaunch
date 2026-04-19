"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AccountsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Accounts error"
      message="Something went wrong loading accounts. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
