/**
 * @file src/tests/rate-limit.test.ts
 * @description Unit tests for sliding-window rate limiter and pruning.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, _resetRateLimitStore } from "../lib/rate-limit";
import { LIMITS } from "../lib/config";

describe("rate-limit module", () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it("allows requests under the rate limit threshold", () => {
    const ip = "192.168.1.1";
    for (let i = 0; i < LIMITS.RATE_LIMIT_MAX; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }
  });

  it("blocks requests once rate limit is exceeded", () => {
    const ip = "192.168.1.2";
    for (let i = 0; i < LIMITS.RATE_LIMIT_MAX; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);
  });

  it("resets after the window expires", () => {
    const ip = "192.168.1.3";
    const now = 1_000_000;
    for (let i = 0; i < LIMITS.RATE_LIMIT_MAX; i++) {
      expect(isRateLimited(ip, now)).toBe(false);
    }
    expect(isRateLimited(ip, now)).toBe(true);

    // After window passes
    const later = now + LIMITS.RATE_LIMIT_WINDOW_MS + 10;
    expect(isRateLimited(ip, later)).toBe(false);
  });

  it("prunes expired entries when map size exceeds RATE_LIMIT_PRUNE_THRESHOLD", () => {
    const now = 2_000_000;
    // Fill up entries past prune threshold
    for (let i = 0; i <= LIMITS.RATE_LIMIT_PRUNE_THRESHOLD + 5; i++) {
      isRateLimited(`10.0.0.${i}`, now);
    }

    // Now advance time so all those are expired
    const later = now + LIMITS.RATE_LIMIT_WINDOW_MS + 500;

    // Trigger another call that exceeds threshold, causing pruning
    const newIp = "172.16.0.1";
    expect(isRateLimited(newIp, later)).toBe(false);
  });
});
