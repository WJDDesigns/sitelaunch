"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function AdminInvitesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Invites error"
      message="Something went wrong loading invites. Your data is safe. Try refreshing the page."
      backHref="/dashboard/admin"
      backLabel="Back to Admin"
    />
  );
}
