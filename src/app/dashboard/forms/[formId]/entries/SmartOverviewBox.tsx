"use client";

import { useState, useTransition } from "react";
import { generateSmartOverview } from "./actions";

interface CachedOverview {
  overview: string;
  generatedAt: string;
  entryCount: number;
}

interface Props {
  formId: string;
  currentEntryCount: number;
  cachedOverview: CachedOverview | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SmartOverviewBox({
  formId,
  currentEntryCount,
  cachedOverview,
}: Props) {
  const [overview, setOverview] = useState(cachedOverview?.overview ?? null);
  const [generatedAt, setGeneratedAt] = useState(
    cachedOverview?.generatedAt ?? null,
  );
  const [cachedCount, setCachedCount] = useState(
    cachedOverview?.entryCount ?? 0,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const newEntries =
    cachedCount > 0 && currentEntryCount > cachedCount
      ? currentEntryCount - cachedCount
      : 0;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateSmartOverview(formId);
        setOverview(result);
        setGeneratedAt(new Date().toISOString());
        setCachedCount(currentEntryCount);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate overview",
        );
      }
    });
  }

  // Collapsed state: no cached overview and not currently generating
  if (!overview && !isPending && !error) {
    return (
      <button
        type="button"
        onClick={handleGenerate}
        className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] hover:border-primary/25 transition-all w-full"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
          <i className="fa-solid fa-wand-magic-sparkles text-primary text-[10px]" />
        </span>
        <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
          Generate Smart Overview
        </span>
        <i className="fa-solid fa-chevron-right text-[8px] text-on-surface-variant/40 group-hover:text-primary/60 ml-auto transition-colors" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
              <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
              Smart Overview
            </span>
            {newEntries > 0 && !isPending && (
              <span className="text-[10px] text-on-surface-variant/50">
                {newEntries} new {newEntries === 1 ? "entry" : "entries"} since
                last analysis
              </span>
            )}
            {generatedAt && !isPending && (
              <span className="text-[10px] text-on-surface-variant/40 ml-auto hidden sm:inline">
                {relativeTime(generatedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary/60 hover:text-primary transition-colors disabled:opacity-40 ml-auto sm:ml-0"
              title="Refresh overview"
            >
              <i
                className={`fa-solid fa-arrows-rotate text-[9px] ${isPending ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Content */}
          {isPending ? (
            <div className="flex items-center gap-2 py-1">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-sm text-on-surface-variant/60">
                Analyzing entries...
              </span>
            </div>
          ) : overview ? (
            <p className="text-sm text-on-surface leading-relaxed">{overview}</p>
          ) : error ? (
            <p className="text-sm text-error/80">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
