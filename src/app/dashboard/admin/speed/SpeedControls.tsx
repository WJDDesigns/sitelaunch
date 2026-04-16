"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flushAllCachesAction,
  flushCacheAction,
  toggleCacheAction,
  revalidateAllAction,
} from "./actions";
import type { CacheStats } from "@/lib/cache-manager";

interface Props {
  caches: CacheStats[];
}

export default function SpeedControls({ caches }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function doAction(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setMsg(null);
    startTransition(async () => {
      const result = await fn();
      setMsg(result.ok ? successMsg : (result.error ?? "Failed."));
      router.refresh();
      if (result.ok) setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => doAction(flushAllCachesAction, "All caches flushed!")}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 bg-error/10 text-error border border-error/20 font-bold text-xs rounded-xl hover:bg-error/20 disabled:opacity-50 transition-all"
        >
          <i className="fa-solid fa-fire text-[10px]" />
          Flush all caches
        </button>
        <button
          onClick={() => doAction(revalidateAllAction, "Dashboard pages revalidated!")}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 font-bold text-xs rounded-xl hover:bg-primary/20 disabled:opacity-50 transition-all"
        >
          <i className="fa-solid fa-rotate text-[10px]" />
          Revalidate all pages
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
          msg.includes("!") ? "bg-tertiary/10 text-tertiary border border-tertiary/20" : "bg-error/10 text-error border border-error/20"
        }`}>
          {msg}
        </div>
      )}

      {/* Cache cards */}
      <div className="space-y-4">
        {caches.map((cache) => {
          const hitPercent = Math.round(cache.hitRate * 100);
          const total = cache.hits + cache.misses;

          return (
            <div
              key={cache.name}
              className={`glass-panel rounded-2xl border p-5 transition-all ${
                cache.enabled ? "border-outline-variant/15" : "border-outline-variant/10 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-on-surface">{cache.name}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      cache.enabled
                        ? "bg-tertiary/10 text-tertiary"
                        : "bg-surface-container-high text-on-surface-variant/50"
                    }`}>
                      {cache.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant/60 mb-3">{cache.description}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 flex-wrap">
                    <div>
                      <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest block">Entries</span>
                      <span className="text-lg font-bold text-on-surface">{cache.entryCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest block">Hit rate</span>
                      <span className={`text-lg font-bold ${hitPercent >= 60 ? "text-tertiary" : hitPercent >= 30 ? "text-amber-400" : "text-on-surface-variant/60"}`}>
                        {total > 0 ? `${hitPercent}%` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest block">Hits / Misses</span>
                      <span className="text-sm text-on-surface">
                        <span className="text-tertiary font-bold">{cache.hits}</span>
                        <span className="text-on-surface-variant/40 mx-1">/</span>
                        <span className="text-on-surface-variant/60">{cache.misses}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest block">TTL</span>
                      <span className="text-sm text-on-surface">{formatTtl(cache.ttlSeconds)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => doAction(() => flushCacheAction(cache.name), `${cache.name} flushed!`)}
                    disabled={pending || !cache.enabled}
                    className="px-3 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:border-error/30 hover:text-error disabled:opacity-40 transition-all"
                    title="Flush this cache"
                  >
                    <i className="fa-solid fa-broom text-[9px] mr-1" />
                    Flush
                  </button>
                  <button
                    onClick={() => doAction(() => toggleCacheAction(cache.name, !cache.enabled), cache.enabled ? "Cache disabled." : "Cache enabled!")}
                    disabled={pending}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all disabled:opacity-40 ${
                      cache.enabled
                        ? "text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                        : "text-tertiary border-tertiary/20 hover:bg-tertiary/10"
                    }`}
                  >
                    {cache.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance tips */}
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          <i className="fa-solid fa-lightbulb text-amber-400 mr-1.5" />
          Performance tips
        </h3>
        <div className="space-y-3">
          <Tip
            icon="fa-image"
            title="Image optimization"
            description="Next.js Image component automatically optimizes images with WebP/AVIF, lazy loading, and responsive sizes."
            status="enabled"
          />
          <Tip
            icon="fa-bolt"
            title="Edge middleware"
            description="Tenant routing and auth checks run at the edge, close to your users, for sub-millisecond redirects."
            status="enabled"
          />
          <Tip
            icon="fa-server"
            title="Server Components"
            description="Dashboard pages use React Server Components by default, reducing client JavaScript bundle size."
            status="enabled"
          />
          <Tip
            icon="fa-arrows-rotate"
            title="On-demand revalidation"
            description="Data is revalidated only when mutations happen (form saves, submissions, etc.) rather than on a timer."
            status="enabled"
          />
          <Tip
            icon="fa-database"
            title="Connection pooling"
            description="Supabase handles connection pooling via PgBouncer. No cold-start DB connection overhead."
            status="enabled"
          />
          <Tip
            icon="fa-globe"
            title="CDN static assets"
            description="Vercel serves static assets (JS, CSS, images) from a global CDN with immutable caching."
            status="enabled"
          />
        </div>
      </div>
    </div>
  );
}

function Tip({ icon, title, description, status }: { icon: string; title: string; description: string; status: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <i className={`fa-solid ${icon} text-[10px] text-primary`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface">{title}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary">
            {status}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant/60 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}
