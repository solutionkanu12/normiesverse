/**
 * In-memory TTL cache with in-flight request de-duplication.
 *
 * Two jobs:
 *  1. Serve repeated reads from memory so we don't burn the 60 req/min budget.
 *  2. Coalesce concurrent identical requests into a single network call
 *     (so e.g. ten components mounting at once cost one fetch, not ten).
 *
 * On-chain Normie data (pixels/traits) is effectively immutable for a given
 * version, so long TTLs are safe; Canvas/history endpoints get shorter TTLs.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms; Infinity = never expires
}

/** Suggested TTLs (ms) by data volatility. Callers may override per-key. */
export const TTL = {
  /** Immutable-ish on-chain art/traits. */
  STATIC: 24 * 60 * 60 * 1000, // 24h
  /** Changes when a Normie is customized/leveled. */
  CANVAS: 5 * 60 * 1000, // 5m
  /** Ownership transfers. */
  OWNERSHIP: 2 * 60 * 1000, // 2m
  /** Global/history feeds. */
  HISTORY: 10 * 60 * 1000, // 10m
  /** Short-lived. */
  SHORT: 30 * 1000, // 30s
} as const;

export class ApiCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  /** Read a live (non-expired) value, or undefined. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = TTL.STATIC): void {
    this.store.set(key, {
      value,
      expiresAt: ttlMs === Infinity ? Infinity : Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  /**
   * Cache-aside fetch with single-flight de-duplication.
   *
   * - Returns a cached value when fresh.
   * - Otherwise runs `loader` once; concurrent callers share that promise.
   * - On success, stores the result with `ttlMs`. On failure, nothing is
   *   cached and the in-flight slot is cleared so the next call can retry.
   */
  async fetch<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number = TTL.STATIC,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /** Diagnostics. */
  get size(): number {
    return this.store.size;
  }
}

/** Shared cache instance for all Normies API traffic from this process. */
export const normiesCache = new ApiCache();
