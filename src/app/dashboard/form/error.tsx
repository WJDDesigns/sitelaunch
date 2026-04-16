"use client";

import ErrorBoundaryUI from "@/components/ErrorBoundaryUI";

export default function FormBuilderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Form builder error"
      message="Something went wrong with the form builder. Your forms are safe. Try refreshing the page."
      backHref="/dashboard/form"
      backLabel="Back to Forms"
    />
  );
}
