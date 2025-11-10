import { describe, expect, it, beforeEach } from "@jest/globals";
import { MemoryCache, buildCacheKey } from "@/lib/cache/memoryCache";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(50);
  });

  it("stores and retrieves values within TTL", () => {
    cache.set("foo", { bar: 1 });
    expect(cache.get<{ bar: number }>("foo")).toEqual({ bar: 1 });
  });

  it("evicts expired entries", async () => {
    cache.set("foo", "bar", 5);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(cache.get("foo")).toBeNull();
  });

  it("invalidates by prefix", () => {
    cache.set("dup:a", 1);
    cache.set("dup:b", 2);
    cache.set("other:c", 3);
    cache.invalidateByPrefix("dup:");
    expect(cache.get("dup:a")).toBeNull();
    expect(cache.get("other:c")).toBe(3);
  });
});

describe("buildCacheKey", () => {
  it("creates deterministic keys", () => {
    const key1 = buildCacheKey("ns", { a: 1 }, [2]);
    const key2 = buildCacheKey("ns", { a: 1 }, [2]);
    expect(key1).toBe(key2);
  });
});
