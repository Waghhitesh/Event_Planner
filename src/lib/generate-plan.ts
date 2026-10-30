/**
 * @file src/lib/generate-plan.ts
 * @description Gemini plan generation service with 2-attempt orchestration,
 * timeout signal forwarding, and deterministic invariant repair.
 */

import { getGeminiModel } from "@/lib/gemini";
import { GeminiResponseSchema } from "@/lib/schemas";
import type { ClientIntake, GeminiResponse } from "@/lib/schemas";
import { buildUserPrompt, buildCorrectivePrompt } from "@/lib/prompt";
import { validatePlanInvariants, normalisePlan } from "@/lib/plan-validation";
import { sanitizeOutput } from "@/lib/security";

export type GeneratePlanResult =
  | { ok: true; plan: GeminiResponse }
  | { ok: false; kind: "timeout" | "quota" | "upstream"; message?: string };

export function isQuotaOrRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object" && "status" in err && (err as { status: unknown }).status === 429) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|RESOURCE_EXHAUSTED|Too Many Requests/i.test(msg);
}

export async function callGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    },
    { signal }
  );
  return result.response.text();
}

export function parseAndValidateResponse(rawText: string): GeminiResponse {
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

/**
 * Orchestrates plan generation with Gemini:
 *  - Attempt 1: Initial user prompt
 *  - Attempt 2: One corrective retry if attempt 1 fails upstream, invalid JSON, schema, or invariants
 *  - If attempt 2 still fails invariants: deterministic normalisePlan fallback
 *  - Honors AbortSignal and detects quota/429 errors immediately
 */
export async function generatePlan(
  intake: ClientIntake,
  signal?: AbortSignal
): Promise<GeneratePlanResult> {
  let plan: GeminiResponse | null = null;
  let initialError: string | null = null;

  // --- ATTEMPT 1: Initial call ---
  try {
    const rawResponse = await callGemini(buildUserPrompt(intake), signal);
    plan = parseAndValidateResponse(rawResponse);
  } catch (err) {
    if (signal?.aborted) {
      return { ok: false, kind: "timeout" };
    }
    if (isQuotaOrRateLimitError(err)) {
      return { ok: false, kind: "quota" };
    }
    initialError = err instanceof Error ? err.message : String(err);
    console.warn("[EventPulse] First Gemini call failed:", initialError);
  }

  if (initialError !== null) {
    // --- ATTEMPT 2: Corrective retry for upstream or parsing error ---
    try {
      const retryText = await callGemini(
        buildCorrectivePrompt(intake, [initialError]),
        signal
      );
      plan = parseAndValidateResponse(retryText);
    } catch (retryErr) {
      if (signal?.aborted) {
        return { ok: false, kind: "timeout" };
      }
      if (isQuotaOrRateLimitError(retryErr)) {
        return { ok: false, kind: "quota" };
      }
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error("[EventPulse] Retry also failed:", retryMsg);
      return { ok: false, kind: "upstream", message: retryMsg };
    }

    // Check invariants on attempt 2's plan: normalise deterministically if invalid
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
          signal
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
    return { ok: false, kind: "upstream", message: "Failed to generate plan." };
  }

  return { ok: true, plan };
}
