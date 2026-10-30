/**
 * @file src/app/api/plan/route.ts
 * @description Next.js Route Handler — POST /api/plan
 *
 * Features:
 *  - Actual body size enforcement (413) protecting against chunked oversize payloads
 *  - In-memory rate limiter per IP with automatic expired timestamp cleanup (429)
 *  - In-memory true-LRU + TTL plan cache (saves Gemini free-tier quota)
 *  - Shared AbortSignal deadline across all model attempts (50s)
 *  - Maximum 2 model attempts per request (initial + one corrective retry)
 *  - Immediate 429 / quota error return without wasteful retries
 *  - Deterministic normalisePlan fallback
 *  - XML-sandboxed prompt via buildUserPrompt / SYSTEM_INSTRUCTION
 *  - Typed error responses and Cache-Control: no-store
 */

import { type NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";
import { ClientIntakeSchema, GeminiResponseSchema } from "@/lib/schemas";
import type { ClientIntake, GeminiResponse } from "@/lib/schemas";
import { buildUserPrompt, buildCorrectivePrompt } from "@/lib/prompt";
import { validatePlanInvariants, normalisePlan } from "@/lib/plan-validation";
import { sanitizeOutput } from "@/lib/security";
import { LIMITS } from "@/lib/config";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Max route execution duration (seconds) — supported by Next.js App Router
// ---------------------------------------------------------------------------
export const maxDuration = 60;

// Shared deadline for all Gemini calls within a single request (50 seconds)
const OVERALL_TIMEOUT_MS = 50_000;

// ---------------------------------------------------------------------------
// Typed error helper
// ---------------------------------------------------------------------------

function jsonError(message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (per IP) with cleanup
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Returns true if the IP has exceeded the allowed request count in the window.
 * Prunes expired entries across the map to prevent unbounded memory growth.
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Prune dead entries when map size grows
  if (rateLimitMap.size > 200) {
    for (const [k, v] of rateLimitMap.entries()) {
      v.timestamps = v.timestamps.filter((t) => now - t < LIMITS.RATE_LIMIT_WINDOW_MS);
      if (v.timestamps.length === 0) {
        rateLimitMap.delete(k);
      }
    }
  }

  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < LIMITS.RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= LIMITS.RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, entry);
    return true;
  }

  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return false;
}

// ---------------------------------------------------------------------------
// In-memory true LRU+TTL plan cache (keyed by SHA-256 of normalised intake)
// ---------------------------------------------------------------------------

interface CacheEntry {
  plan: GeminiResponse;
  expiresAt: number;
}

const planCache = new Map<string, CacheEntry>();

function cacheKey(intake: ClientIntake): string {
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

function getFromCache(key: string): GeminiResponse | null {
  const entry = planCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    planCache.delete(key);
    return null;
  }
  // True LRU: re-insert so it becomes the most recently used (at the end of Map iteration)
  planCache.delete(key);
  planCache.set(key, entry);
  return entry.plan;
}

function setInCache(key: string, plan: GeminiResponse): void {
  // Evict least-recently used entry (first key in Map) if at capacity
  if (planCache.size >= LIMITS.CACHE_MAX_SIZE) {
    const firstKey = planCache.keys().next().value;
    if (firstKey !== undefined) planCache.delete(firstKey);
  }
  planCache.set(key, { plan, expiresAt: Date.now() + LIMITS.CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Quota / Rate-limit detection
// ---------------------------------------------------------------------------

function isQuotaOrRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object" && "status" in err && (err as { status: unknown }).status === 429) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|RESOURCE_EXHAUSTED|Too Many Requests/i.test(msg);
}

// ---------------------------------------------------------------------------
// Gemini call with AbortSignal
// ---------------------------------------------------------------------------

async function callGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    },
    { signal }
  );
  return result.response.text();
}

// ---------------------------------------------------------------------------
// Parse + validate Gemini response text
// ---------------------------------------------------------------------------

function parseAndValidateResponse(rawText: string): GeminiResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AI returned non-JSON response");
  }

  const validated = GeminiResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Schema mismatch: ${JSON.stringify(validated.error.flatten())}`);
  }

  const plan = validated.data;
  return {
    ...plan,
    eventName: sanitizeOutput(plan.eventName),
    themeSummary: sanitizeOutput(plan.themeSummary),
    budgetBreakdown: plan.budgetBreakdown.map((item) => ({
      ...item,
      category: sanitizeOutput(item.category),
      costSavingTip: sanitizeOutput(item.costSavingTip),
    })),
    timeline: plan.timeline.map((phase) => ({
      ...phase,
      phase: sanitizeOutput(phase.phase),
      tasks: phase.tasks.map(sanitizeOutput),
    })),
    vendorChecklist: plan.vendorChecklist.map((vendor) => ({
      ...vendor,
      service: sanitizeOutput(vendor.service),
      vettingQuestions: vendor.vettingQuestions.map(sanitizeOutput),
    })),
    personalizedIdeas: plan.personalizedIdeas.map((idea) => ({
      ...idea,
      idea: sanitizeOutput(idea.idea),
      implementationDetails: sanitizeOutput(idea.implementationDetails),
    })),
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 0. Check API key
  if (!process.env.GEMINI_API_KEY) {
    return jsonError("AI service is not configured on this server.", 503);
  }

  // 1. Content-Length header quick check (if present)
  const headerContentLength = Number(request.headers.get("content-length") ?? 0);
  if (headerContentLength > LIMITS.MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  // 2. Read actual body text and enforce MAX_BODY_BYTES on actual length
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return jsonError("Failed to read request body.", 400);
  }

  if (Buffer.byteLength(rawText, "utf8") > LIMITS.MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  // 3. Rate limiting per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    const retryAfter = Math.ceil(LIMITS.RATE_LIMIT_WINDOW_MS / 1_000);
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // 4. Parse JSON
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return jsonError("Invalid JSON in request body.", 400);
  }

  // 5. Validate & type-narrow intake form data
  const parsed = ClientIntakeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("Validation failed.", 400, parsed.error.flatten());
  }
  const intake = parsed.data;

  // 6. Check plan cache
  const key = cacheKey(intake);
  const cached = getFromCache(key);
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Cache": "HIT" },
    });
  }

  // 7. Setup shared deadline AbortController across all model attempts
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);

  try {
    let plan: GeminiResponse | null = null;
    let initialError: string | null = null;

    // --- ATTEMPT 1: Initial call ---
    try {
      const rawResponse = await callGemini(buildUserPrompt(intake), controller.signal);
      plan = parseAndValidateResponse(rawResponse);
    } catch (err) {
      if (controller.signal.aborted) {
        return jsonError("AI request timed out.", 504);
      }
      if (isQuotaOrRateLimitError(err)) {
        return NextResponse.json(
          { error: "AI service quota exceeded. Please wait a moment." },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
              "Cache-Control": "no-store",
            },
          }
        );
      }
      initialError = err instanceof Error ? err.message : String(err);
      console.warn("[EventPulse] First Gemini call failed:", initialError);
    }

    if (initialError !== null) {
      // --- ATTEMPT 2: Corrective retry for upstream or parsing error ---
      try {
        const retryText = await callGemini(
          buildCorrectivePrompt(intake, [initialError]),
          controller.signal
        );
        plan = parseAndValidateResponse(retryText);
      } catch (retryErr) {
        if (controller.signal.aborted) {
          return jsonError("AI request timed out.", 504);
        }
        if (isQuotaOrRateLimitError(retryErr)) {
          return NextResponse.json(
            { error: "AI service quota exceeded. Please wait a moment." },
            {
              status: 429,
              headers: {
                "Retry-After": "60",
                "Cache-Control": "no-store",
              },
            }
          );
        }
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error("[EventPulse] Retry also failed:", retryMsg);
        return jsonError("AI service temporarily unavailable. Please try again.", 502);
      }

      // Check invariants on attempt 2's plan: normalise deterministically if invalid (no more calls allowed!)
      const inv = validatePlanInvariants(plan, intake);
      if (!inv.valid) {
        plan = normalisePlan(plan, intake);
      }
    } else if (plan !== null) {
      // Attempt 1 succeeded — check invariants
      const inv = validatePlanInvariants(plan, intake);
      if (!inv.valid) {
        console.warn("[EventPulse] Plan invariants failed:", inv.errors);
        // --- ATTEMPT 2: Corrective retry for invariant violations ---
        try {
          const retryText = await callGemini(
            buildCorrectivePrompt(intake, inv.errors),
            controller.signal
          );
          const retryPlan = parseAndValidateResponse(retryText);
          const retryInv = validatePlanInvariants(retryPlan, intake);
          plan = retryInv.valid ? retryPlan : normalisePlan(retryPlan, intake);
        } catch {
          // If corrective retry fails, normalise original plan deterministically
          plan = normalisePlan(plan, intake);
        }
      }
    }

    if (!plan) {
      return jsonError("Failed to generate plan.", 500);
    }

    // 8. Store in cache and return
    setInCache(key, plan);
    return NextResponse.json(plan, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Cache": "MISS" },
    });
  } finally {
    clearTimeout(timer);
  }
}
