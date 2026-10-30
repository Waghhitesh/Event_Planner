/**
 * @file src/lib/plan-cache.ts
 * @description In-memory true LRU + TTL plan cache keyed by SHA-256 of normalised intake.
 */

import { createHash } from "crypto";
import { LIMITS } from "@/lib/config";
import type { ClientIntake, GeminiResponse } from "@/lib/schemas";

interface CacheEntry {
  plan: GeminiResponse;
  expiresAt: number;
}

const planCache = new Map<string, CacheEntry>();

/**
 * Computes a deterministic SHA-256 cache key for an intake payload.
 */
export function cacheKey(intake: ClientIntake): string {
  const normalised = JSON.stringify({
    eventType: intake.eventType,
    eventDate: intake.eventDate,
    location: intake.location.trim().toLowerCase(),
    currency: intake.currency ?? "INR",
    totalBudget: intake.totalBudget,
    guestCount: intake.guestCount,
    themePreferences: intake.themePreferences.trim().toLowerCase(),
    specialRequirements: intake.specialRequirements.trim().toLowerCase(),
  });
  return createHash("sha256").update(normalised).digest("hex");
}

/**
 * Retrieves a plan from the cache if not expired.
 * On hit, refreshes entry position to implement true LRU eviction.
 */
export function getFromCache(key: string, now: number = Date.now()): GeminiResponse | null {
  const entry = planCache.get(key);
  if (!entry) return null;
  if (now > entry.expiresAt) {
    planCache.delete(key);
    return null;
  }
  // True LRU: re-insert so it becomes the most recently used (at the end of Map iteration)
  planCache.delete(key);
  planCache.set(key, entry);
  return entry.plan;
}

/**
 * Stores a plan in the LRU cache with TTL. Evicts least-recently used entry if full.
 */
export function setInCache(key: string, plan: GeminiResponse, now: number = Date.now()): void {
  // Evict least-recently used entry (first key in Map) if at capacity
  if (planCache.size >= LIMITS.CACHE_MAX_SIZE) {
    const firstKey = planCache.keys().next().value;
    if (firstKey !== undefined) planCache.delete(firstKey);
  }
  planCache.set(key, { plan, expiresAt: now + LIMITS.CACHE_TTL_MS });
}

/** Reset plan cache store (used in tests). */
export function _resetPlanCacheStore(): void {
  planCache.clear();
}
