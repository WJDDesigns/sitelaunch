"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminSecurityError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Security error"
      message="Something went wrong loading security settings. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
