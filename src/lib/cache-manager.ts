/**
 * Centralized cache manager for SiteLaunch.
 *
 * Provides a registry of all in-memory caches and a way to flush them
 * from the admin Speed page. Also exposes cache status (entry counts,
 * hit/miss rates) for diagnostics.
 */

export interface CacheStats {
  name: string;
  description: string;
  entryCount: number;
  hitRate: number; // 0-1
  hits: number;
  misses: number;
  ttlSeconds: number;
  enabled: boolean;
}

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

interface CacheConfig {
  name: string;
  description: string;
  ttlMs: number;
}

class ManagedCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private _hits = 0;
  private _misses = 0;
  private _enabled = true;
  public readonly config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  get(key: string): T | null {
    if (!this._enabled) {
      this._misses++;
      return null;
    }
    const entry = this.store.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() - entry.fetchedAt > this.config.ttlMs) {
      this.store.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, fetchedAt: Date.now() });
  }

  flush(): void {
    this.store.clear();
    this._hits = 0;
    this._misses = 0;
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(v: boolean) {
    this._enabled = v;
    if (!v) this.store.clear();
  }

  get stats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      name: this.config.name,
      description: this.config.description,
      entryCount: this.store.size,
      hitRate: total > 0 ? this._hits / total : 0,
      hits: this._hits,
      misses: this._misses,
      ttlSeconds: Math.round(this.config.ttlMs / 1000),
      enabled: this._enabled,
    };
  }
}

// ── Registered Caches ──────────────────────────────────────────────

export const emailTemplateCache = new ManagedCache<{ subject: string; html_body: string }>({
  name: "Email Templates",
  description: "Caches email template HTML from the database to avoid repeated queries on every notification send.",
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

export const plansCache = new ManagedCache<unknown[]>({
  name: "Plans",
  description: "Caches the active plan definitions from the database for billing page and limit checks.",
  ttlMs: 10 * 60 * 1000, // 10 minutes
});

export const partnerBrandingCache = new ManagedCache<Record<string, unknown>>({
  name: "Partner Branding",
  description: "Caches partner branding (colors, logos, names) for storefront rendering to reduce DB load.",
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

// Registry of all caches
const ALL_CACHES = [emailTemplateCache, plansCache, partnerBrandingCache];

/**
 * Get stats for all registered caches.
 */
export function getAllCacheStats(): CacheStats[] {
  return ALL_CACHES.map((c) => c.stats);
}

/**
 * Flush all registered caches.
 */
export function flushAllCaches(): void {
  ALL_CACHES.forEach((c) => c.flush());
}

/**
 * Flush a specific cache by name.
 */
export function flushCacheByName(name: string): boolean {
  const cache = ALL_CACHES.find((c) => c.config.name === name);
  if (!cache) return false;
  cache.flush();
  return true;
}

/**
 * Enable or disable a cache by name.
 */
export function setCacheEnabled(name: string, enabled: boolean): boolean {
  const cache = ALL_CACHES.find((c) => c.config.name === name);
  if (!cache) return false;
  cache.enabled = enabled;
  return true;
}
