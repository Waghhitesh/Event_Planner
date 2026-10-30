/**
 * @file src/lib/http.ts
 * @description HTTP response helpers for Next.js App Router route handlers.
 */

import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/config";

/**
 * Returns a standardized JSON error response with Cache-Control: no-store.
 */
export function jsonError(message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

/**
 * Returns a standardized 429 Rate Limited response with Retry-After header.
 */
export function rateLimitedResponse(
  retryAfterSeconds: number = LIMITS.RATE_LIMIT_RETRY_AFTER_SECONDS,
  message: string = "Too many requests. Please wait a moment and try again."
): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  );
}
