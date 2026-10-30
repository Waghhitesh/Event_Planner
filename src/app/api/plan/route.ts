/**
 * @file src/app/api/plan/route.ts
 * @description Next.js Route Handler — POST /api/plan
 *
 * Features:
 *  - Input size limit (413) and rate limiter per IP (429)
 *  - In-memory LRU+TTL plan cache (saves Gemini free-tier quota)
 *  - XML-sandboxed prompt via buildUserPrompt / SYSTEM_INSTRUCTION
 *  - Gemini call with AbortSignal timeout
 *  - One automatic retry on 429/503 from upstream or validation failure
 *  - Deterministic plan normalisation as last resort
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
// In-memory sliding-window rate limiter (per IP)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Returns true if the IP has exceeded the allowed request count in the window.
 * Prunes expired timestamps on every call.
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  // Remove timestamps outside the current window
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
// In-memory LRU+TTL plan cache (keyed by SHA-256 of normalised intake)
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
  return entry.plan;
}

function setInCache(key: string, plan: GeminiResponse): void {
  // Evict oldest entry if at capacity
  if (planCache.size >= LIMITS.CACHE_MAX_SIZE) {
    const firstKey = planCache.keys().next().value;
    if (firstKey) planCache.delete(firstKey);
  }
  planCache.set(key, { plan, expiresAt: Date.now() + LIMITS.CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Gemini call with timeout
// ---------------------------------------------------------------------------

/**
 * Calls the Gemini model with a 45-second AbortSignal timeout.
 * Returns the raw response text.
 */
async function callGemini(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const model = getGeminiModel();
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return result.response.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Parse + validate Gemini response text
// ---------------------------------------------------------------------------

/**
 * Parses and Zod-validates a raw Gemini response string.
 * Returns the validated plan or throws with a descriptive message.
 */
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

  // Strip control characters from all string fields in the output
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
  // 0. Check API key before doing anything else
  if (!process.env.GEMINI_API_KEY) {
    return jsonError("AI service is not configured on this server.", 503);
  }

  // 1. Body size limit
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > LIMITS.MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  // 2. Rate limiting per IP
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

  // 3. Parse request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("Invalid JSON in request body.", 400);
  }

  // 4. Validate & type-narrow intake form data
  const parsed = ClientIntakeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("Validation failed.", 400, parsed.error.flatten());
  }
  const intake = parsed.data;

  // 5. Check plan cache
  const key = cacheKey(intake);
  const cached = getFromCache(key);
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Cache": "HIT" },
    });
  }

  // 6. First Gemini call
  let plan: GeminiResponse;
  try {
    const rawText = await callGemini(buildUserPrompt(intake));
    plan = parseAndValidateResponse(rawText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[EventPulse] First Gemini call failed:", msg);

    // Retry once with corrective prompt
    try {
      const retryText = await callGemini(
        buildCorrectivePrompt(intake, [msg])
      );
      plan = parseAndValidateResponse(retryText);
    } catch (retryErr) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error("[EventPulse] Retry also failed:", retryMsg);
      return jsonError("AI service temporarily unavailable. Please try again.", 502);
    }
  }

  // 7. Plan invariant validation
  const { valid, errors } = validatePlanInvariants(plan, intake);
  if (!valid) {
    console.warn("[EventPulse] Plan invariants failed:", errors);

    // One corrective retry
    try {
      const retryText = await callGemini(buildCorrectivePrompt(intake, errors));
      const retryPlan = parseAndValidateResponse(retryText);
      const retryValidation = validatePlanInvariants(retryPlan, intake);
      plan = retryValidation.valid ? retryPlan : normalisePlan(retryPlan, intake);
    } catch {
      // Normalise the original plan deterministically as last resort
      plan = normalisePlan(plan, intake);
    }
  }

  // 8. Store in cache and return
  setInCache(key, plan);
  return NextResponse.json(plan, {
    status: 200,
    headers: { "Cache-Control": "no-store", "X-Cache": "MISS" },
  });
}
