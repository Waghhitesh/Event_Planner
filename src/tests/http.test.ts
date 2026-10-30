/**
 * @file src/tests/http.test.ts
 * @description Unit tests for HTTP response helpers.
 */

import { describe, it, expect } from "vitest";
import { jsonError, rateLimitedResponse } from "../lib/http";
import { LIMITS } from "../lib/config";

describe("http module", () => {
  it("creates a standardized JSON error response with headers", async () => {
    const res = jsonError("Something went wrong", 400, { field: "invalid" });
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { error: string; details: { field: string } };
    expect(body.error).toBe("Something went wrong");
    expect(body.details.field).toBe("invalid");
  });

  it("creates a default 429 rateLimitedResponse with Retry-After", async () => {
    const res = rateLimitedResponse();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String(LIMITS.RATE_LIMIT_RETRY_AFTER_SECONDS));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Too many requests");
  });

  it("supports custom retry-after and message in rateLimitedResponse", async () => {
    const res = rateLimitedResponse(120, "Quota exceeded.");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Quota exceeded.");
  });
});
