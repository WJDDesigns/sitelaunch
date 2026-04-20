"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminAnnounceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Announcements error"
      message="Something went wrong loading announcements. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
