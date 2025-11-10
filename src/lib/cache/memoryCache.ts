type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly defaultTtlMs: number) {}

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  public invalidate(key: string): void {
    this.store.delete(key);
  }

  public invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  public flush(): void {
    this.store.clear();
  }
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DUPLICATE_CACHE_TTL_MS = 2 * 60 * 1000;

function parseTtl(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`Invalid cache TTL '${value}', falling back to ${fallback}ms.`);
    return fallback;
  }
  return parsed;
}

const DEFAULT_TTL_MS = parseTtl(process.env.CACHE_DEFAULT_TTL_MS, DEFAULT_CACHE_TTL_MS);

export const CACHE_NAMESPACES = {
  duplicateDetection: "duplicate",
} as const;

export const CACHE_PREFIXES = {
  duplicateDetection: `${CACHE_NAMESPACES.duplicateDetection}:`,
} as const;

export const cache = new MemoryCache(DEFAULT_TTL_MS);

export const CACHE_TTLS = {
  duplicateDetection: parseTtl(process.env.CACHE_DUPLICATE_TTL_MS, DUPLICATE_CACHE_TTL_MS),
};

export function buildCacheKey(namespace: string, ...parts: unknown[]): string {
  return `${namespace}:${JSON.stringify(parts)}`;
}
