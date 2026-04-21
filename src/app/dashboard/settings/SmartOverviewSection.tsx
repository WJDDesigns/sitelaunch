"use client";

import { useState, useTransition } from "react";
import { toggleSmartOverviewAction } from "./actions";

interface Props {
  enabled: boolean;
  forPartners: boolean;
  hasAiProvider: boolean;
  isAgency: boolean;
}

export default function SmartOverviewSection({
  enabled,
  forPartners,
  hasAiProvider,
  isAgency,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useState(enabled);
  const [optimisticForPartners, setOptimisticForPartners] = useState(forPartners);

  function handleToggle() {
    if (!hasAiProvider) return;
    const next = !optimisticEnabled;
    setOptimisticEnabled(next);
    startTransition(async () => {
      await toggleSmartOverviewAction(next, next ? optimisticForPartners : false);
    });
  }

  function handleForPartnersToggle() {
    if (!hasAiProvider || !optimisticEnabled) return;
    const next = !optimisticForPartners;
    setOptimisticForPartners(next);
    startTransition(async () => {
      await toggleSmartOverviewAction(optimisticEnabled, next);
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
              Connect an AI provider in Integrations to use Smart Overview.
            </p>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={optimisticEnabled}
          disabled={!hasAiProvider || isPending}
          onClick={handleToggle}
          className={`relative mt-1 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40 ${
            optimisticEnabled ? "bg-primary" : "bg-outline-variant/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
              optimisticEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Agency: enable for child partners */}
      {isAgency && optimisticEnabled && (
        <div className="mt-4 pt-4 border-t border-outline-variant/[0.08]">
          <label className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              role="switch"
              aria-checked={optimisticForPartners}
              disabled={!hasAiProvider || isPending}
              onClick={handleForPartnersToggle}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40 ${
                optimisticForPartners ? "bg-primary" : "bg-outline-variant/20"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  optimisticForPartners ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
                Also enable for your partners
              </span>
              <p className="text-xs text-on-surface-variant/50 mt-0.5">
                Partners under your agency will see Smart Overview on their entries pages using your AI provider.
              </p>
            </div>
          </label>
        </div>
      )}
    </section>
  );
}
