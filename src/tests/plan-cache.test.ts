/**
 * @file src/tests/plan-cache.test.ts
 * @description Unit tests for in-memory LRU/TTL plan cache.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { cacheKey, getFromCache, setInCache, _resetPlanCacheStore } from "../lib/plan-cache";
import { LIMITS } from "../lib/config";
import { MOCK_PLAN, VALID_INTAKE } from "./fixtures";

describe("plan-cache module", () => {
  beforeEach(() => {
    _resetPlanCacheStore();
  });

  it("produces deterministic cache keys regardless of casing and whitespace", () => {
    const key1 = cacheKey(VALID_INTAKE);
    const key2 = cacheKey({
      ...VALID_INTAKE,
      location: `  ${VALID_INTAKE.location.toUpperCase()}  `,
      themePreferences: `  ${VALID_INTAKE.themePreferences.toUpperCase()}  `,
    });
    expect(key1).toBe(key2);
  });

  it("differentiates keys on different currencies or budgets", () => {
    const key1 = cacheKey({ ...VALID_INTAKE, currency: "INR" });
    const key2 = cacheKey({ ...VALID_INTAKE, currency: "USD" });
    const key3 = cacheKey({ ...VALID_INTAKE, totalBudget: VALID_INTAKE.totalBudget + 1000 });
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);

    // Default currency fallback if currency is undefined
    const intakeNoCurrency = { ...VALID_INTAKE } as Record<string, unknown>;
    delete intakeNoCurrency.currency;
    expect(cacheKey(intakeNoCurrency as unknown as typeof VALID_INTAKE)).toBe(key1);
  });

  it("returns null on cache miss", () => {
    expect(getFromCache("non-existent-key")).toBeNull();
  });

  it("stores and retrieves a plan before TTL expiration", () => {
    const key = "test-key-1";
    const now = 1_000_000;
    setInCache(key, MOCK_PLAN, now);
    expect(getFromCache(key, now + 1000)).toEqual(MOCK_PLAN);
  });

  it("returns null and deletes entry after TTL expiration", () => {
    const key = "test-key-2";
    const now = 1_000_000;
    setInCache(key, MOCK_PLAN, now);
    const expiredTime = now + LIMITS.CACHE_TTL_MS + 1;
    expect(getFromCache(key, expiredTime)).toBeNull();
    // Subsequent check confirms it was deleted
    expect(getFromCache(key, now)).toBeNull();
  });

  it("evicts least recently used entry when cache reaches CACHE_MAX_SIZE", () => {
    const now = 1_000_000;
    // Fill cache up to MAX_SIZE
    for (let i = 0; i < LIMITS.CACHE_MAX_SIZE; i++) {
      setInCache(`key-${i}`, { ...MOCK_PLAN, eventName: `Event ${i}` }, now);
    }

    // Access key-0 so it is refreshed to MRU (most recently used)
    expect(getFromCache("key-0", now)).not.toBeNull();

    // Insert another entry (should evict key-1, NOT key-0)
    setInCache("key-new", MOCK_PLAN, now);

    expect(getFromCache("key-0", now)).not.toBeNull();
    expect(getFromCache("key-1", now)).toBeNull();
    expect(getFromCache("key-new", now)).not.toBeNull();
  });
});
