"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toggleShowAllFormsAction } from "./landing-actions";

interface Props {
  showAllForms: boolean;
  storefrontUrl: string;
}

export default function LandingModeToggle({ showAllForms, storefrontUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(showAllForms);
  const [error, setError] = useState<string | null>(null);

  // Sync with server prop when it changes (e.g. after router.refresh)
  useEffect(() => {
    setShowAll(showAllForms);
  }, [showAllForms]);

  function handleToggle(value: boolean) {
    if (value === showAll) return;
    setShowAll(value);
    setError(null);
    startTransition(async () => {
      const result = await toggleShowAllFormsAction(value);
      if (result.ok) {
        router.refresh();
      } else {
        setShowAll(!value);
        setError(result.error ?? "Failed to save.");
      }
    });
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] p-5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Landing page mode</h3>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">
            {showAll
              ? "Clients see all your forms in a grid and choose which one to fill out."
              : "Clients land directly on your default form."}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-high rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => handleToggle(false)}
            disabled={pending}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              !showAll
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            {pending && !showAll ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </span>
            ) : "Default form"}
          </button>
          <button
            onClick={() => handleToggle(true)}
            disabled={pending}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              showAll
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            {pending && showAll ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </span>
            ) : "Show all forms"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-error font-medium mt-2">{error}</p>
      )}

      {showAll && !error && (
        <p className="text-[11px] text-on-surface-variant/40 mt-3 flex items-center gap-1.5">
          <i className="fa-solid fa-globe text-[9px]" />
          Preview: <a href={storefrontUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{storefrontUrl.replace(/^https?:\/\//, "")}</a>
        </p>
      )}
    </div>
  );
}
