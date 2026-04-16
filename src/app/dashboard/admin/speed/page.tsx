import { requireSuperadmin } from "@/lib/auth";
import { getAllCacheStats } from "@/lib/cache-manager";
import SpeedControls from "./SpeedControls";

export default async function SpeedPage() {
  await requireSuperadmin();
  const cacheStats = getAllCacheStats();

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          <i className="fa-solid fa-gauge-high text-primary mr-3" />
          Speed &amp; Caching
        </h1>
        <p className="text-on-surface-variant mt-1">
          Monitor and manage application caches, flush stale data, and review performance optimizations.
        </p>
      </header>

      <SpeedControls caches={cacheStats} />
    </div>
  );
}
