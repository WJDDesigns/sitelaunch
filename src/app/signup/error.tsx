"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function SignupError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Sign up error"
      message="Something went wrong loading the sign up page. Try refreshing the page."
      backHref="/"
      backLabel="Back to Home"
    />
  );
}
