"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function LoginError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Login error"
      message="Something went wrong loading the login page. Try refreshing the page."
      backHref="/"
      backLabel="Back to Home"
    />
  );
}
