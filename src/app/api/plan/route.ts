/**
 * @file src/app/api/plan/route.ts
 * @description Next.js Route Handler — POST /api/plan
 *
 * Responsibilities:
 *  - Guard API key & rate limit before reading body
 *  - Guard request body size (413)
 *  - Parse & validate client intake schema (400)
 *  - Serve cached plans on cache hit (200 X-Cache: HIT)
 *  - Dispatch plan generation with deadline signal
 *  - Cache valid plans and return response
 */

import { type NextRequest, NextResponse } from "next/server";
import { ClientIntakeSchema } from "@/lib/schemas";
import { validatePlanInvariants } from "@/lib/plan-validation";
import { LIMITS } from "@/lib/config";
import { isRateLimited } from "@/lib/rate-limit";
import { cacheKey, getFromCache, setInCache } from "@/lib/plan-cache";
import { generatePlan } from "@/lib/generate-plan";
import { jsonError, rateLimitedResponse } from "@/lib/http";

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 0. Guard: check API key
  if (!process.env.GEMINI_API_KEY) {
    return jsonError("AI service is not configured on this server.", 503);
  }

  // 1. Guard: rate limit check BEFORE reading request body
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return rateLimitedResponse(
      Math.ceil(LIMITS.RATE_LIMIT_WINDOW_MS / 1_000),
      "Too many requests. Please wait a moment and try again."
    );
  }

  // 2. Guard: Content-Length quick check
  const headerContentLength = Number(request.headers.get("content-length") ?? 0);
  if (headerContentLength > LIMITS.MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  // 3. Read body and enforce actual byte length
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return jsonError("Failed to read request body.", 400);
  }
  if (Buffer.byteLength(rawText, "utf8") > LIMITS.MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  // 4. Parse & validate JSON
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return jsonError("Invalid JSON in request body.", 400);
  }

  const parsed = ClientIntakeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("Validation failed.", 400, parsed.error.flatten());
  }
  const intake = parsed.data;

  // 5. Check cache
  const key = cacheKey(intake);
  const cached = getFromCache(key);
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Cache": "HIT" },
    });
  }

  // 6. Call plan generation service with shared deadline
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.OVERALL_TIMEOUT_MS);

  try {
    const result = await generatePlan(intake, controller.signal);
    if (!result.ok) {
      if (result.kind === "timeout") {
        return jsonError("AI request timed out.", 504);
      }
      if (result.kind === "quota") {
        return rateLimitedResponse(
          LIMITS.RATE_LIMIT_RETRY_AFTER_SECONDS,
          "AI service quota exceeded. Please wait a moment."
        );
      }
      return jsonError("AI service temporarily unavailable. Please try again.", 502);
    }

    // 7. Cache valid plan & respond
    if (validatePlanInvariants(result.plan, intake).valid) {
      setInCache(key, result.plan);
    }
    return NextResponse.json(result.plan, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Cache": "MISS" },
    });
  } finally {
    clearTimeout(timer);
  }
}
