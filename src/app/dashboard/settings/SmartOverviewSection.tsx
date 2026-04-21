"use client";

import { useTransition } from "react";
import { toggleSmartOverviewAction } from "./actions";

interface Props {
  enabled: boolean;
  hasAiProvider: boolean;
}

export default function SmartOverviewSection({ enabled, hasAiProvider }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!hasAiProvider) return;
    startTransition(async () => {
      await toggleSmartOverviewAction(!enabled);
    });
  }

  return (
    <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <i className="fa-solid fa-wand-magic-sparkles text-primary text-sm" />
            <h2 className="text-lg font-bold font-headline text-on-surface">
              Smart Overview
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant/60">
            When enabled, linqme uses your connected AI provider to analyze
            patterns across form entries -- surfacing trends, common themes, and
            items that may need attention. The overview appears at the top of
            each form&apos;s entries page.
          </p>

          {!hasAiProvider && (
            <p className="text-xs text-on-surface-variant/40 mt-3">
              Connect an AI provider in the AI Integrations section to use Smart
              Overview.
            </p>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={!hasAiProvider || isPending}
          onClick={handleToggle}
          className={`relative mt-1 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40 ${
            enabled ? "bg-primary" : "bg-outline-variant/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
