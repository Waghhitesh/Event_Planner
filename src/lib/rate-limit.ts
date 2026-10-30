/**
 * @file src/lib/rate-limit.ts
 * @description In-memory sliding-window rate limiter per IP with automatic pruning.
 */

import { LIMITS } from "@/lib/config";

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Returns true if the IP has exceeded the allowed request count in the window.
 * Prunes expired entries across the map when size exceeds RATE_LIMIT_PRUNE_THRESHOLD.
 */
export function isRateLimited(ip: string, now: number = Date.now()): boolean {
  // Prune dead entries when map size exceeds threshold
  if (rateLimitMap.size > LIMITS.RATE_LIMIT_PRUNE_THRESHOLD) {
    for (const [k, v] of rateLimitMap.entries()) {
      v.timestamps = v.timestamps.filter((t) => now - t < LIMITS.RATE_LIMIT_WINDOW_MS);
      if (v.timestamps.length === 0) {
        rateLimitMap.delete(k);
      }
    }
  }

  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < LIMITS.RATE_LIMIT_WINDOW_MS);

  if (entry.timestamps.length >= LIMITS.RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, entry);
    return true;
  }

  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return false;
}

/** Reset rate limit store (used in tests). */
export function _resetRateLimitStore(): void {
  rateLimitMap.clear();
}
