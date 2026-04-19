"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function SettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Settings error"
      message="Something went wrong loading settings. Your data is safe. Try refreshing the page."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
