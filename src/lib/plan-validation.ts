/**
 * @file plan-validation.ts
 * @description Post-generation plan invariant validation and normalisation
 * for EventPulse AI. Ensures arithmetic consistency and quality minimums
 * before returning a plan to the client.
 */

import type { GeminiResponse } from "./schemas";
import type { ClientIntake } from "./schemas";
import { PLAN_THRESHOLDS } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that a Gemini-generated plan meets all arithmetic and quality
 * invariants relative to the original user intake.
 *
 * Checks performed:
 *  - Sum of budgetBreakdown.allocatedAmount is within 1% of totalEstimatedCost
 *  - totalEstimatedCost does not exceed the user's stated totalBudget
 *  - At least MIN_TIMELINE_PHASES planning phases exist
 *  - At least MIN_VENDORS vendor entries exist
 *  - At least MIN_IDEAS personalised ideas exist
 *
 * @param plan   - The Gemini-generated plan to validate.
 * @param intake - The original user intake form data.
 * @returns A ValidationResult with a list of any errors found.
 */
export function validatePlanInvariants(
  plan: GeminiResponse,
  intake: ClientIntake
): ValidationResult {
  const errors: string[] = [];

  // 1. Budget arithmetic check
  const sum = plan.budgetBreakdown.reduce((acc, item) => acc + item.allocatedAmount, 0);
  const diff = Math.abs(sum - plan.totalEstimatedCost);
  const tolerance = plan.totalEstimatedCost * PLAN_THRESHOLDS.BUDGET_TOLERANCE;
  if (diff > tolerance && plan.totalEstimatedCost > 0) {
    errors.push(
      `Budget sum mismatch: items sum to ${sum} but totalEstimatedCost is ${plan.totalEstimatedCost} (diff=${diff.toFixed(2)}, tolerance=${tolerance.toFixed(2)})`
    );
  }

  // 2. Total must not exceed user's budget
  if (plan.totalEstimatedCost > intake.totalBudget) {
    errors.push(
      `totalEstimatedCost (${plan.totalEstimatedCost}) exceeds user's totalBudget (${intake.totalBudget})`
    );
  }

  // 3. Minimum timeline phases
  if (plan.timeline.length < PLAN_THRESHOLDS.MIN_TIMELINE_PHASES) {
    errors.push(
      `Timeline has ${plan.timeline.length} phases; minimum required is ${PLAN_THRESHOLDS.MIN_TIMELINE_PHASES}`
    );
  }

  // 4. Minimum vendors
  if (plan.vendorChecklist.length < PLAN_THRESHOLDS.MIN_VENDORS) {
    errors.push(
      `Vendor checklist has ${plan.vendorChecklist.length} entries; minimum required is ${PLAN_THRESHOLDS.MIN_VENDORS}`
    );
  }

  // 5. Minimum ideas
  if (plan.personalizedIdeas.length < PLAN_THRESHOLDS.MIN_IDEAS) {
    errors.push(
      `Personalised ideas has ${plan.personalizedIdeas.length} entries; minimum required is ${PLAN_THRESHOLDS.MIN_IDEAS}`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Deterministic normalisation
// ---------------------------------------------------------------------------

/**
 * Normalises a plan deterministically when it fails validation.
 * This is a last-resort path: prefer retrying Gemini first.
 *
 * Normalisation rules:
 *  - Recomputes totalEstimatedCost as the exact sum of allocated amounts
 *  - If that sum still exceeds the user's budget, scales every item down
 *    proportionally so the total equals 95% of the budget (leaving 5% buffer)
 *
 * Does NOT add missing timeline/vendor/idea entries — those require a model
 * retry. Only budget arithmetic is fixed deterministically.
 *
 * @param plan   - The plan to normalise (mutated in a new object, not in-place).
 * @param intake - The original user intake.
 * @returns A new GeminiResponse with corrected budget figures.
 */
export function normalisePlan(plan: GeminiResponse, intake: ClientIntake): GeminiResponse {
  const rawSum = plan.budgetBreakdown.reduce((acc, item) => acc + item.allocatedAmount, 0);

  // Target is the sum itself, capped at the user's budget
  const maxAllowed = intake.totalBudget;
  const targetTotal = rawSum > maxAllowed ? maxAllowed * 0.95 : rawSum;

  const scaleFactor = rawSum > 0 ? targetTotal / rawSum : 1;

  const normalisedBreakdown = plan.budgetBreakdown.map((item) => ({
    category: item.category,
    priority: item.priority,
    costSavingTip: item.costSavingTip,
    allocatedAmount: Math.round(item.allocatedAmount * scaleFactor),
  }));

  // Adjust the last item for rounding errors to make the sum exact
  const normalisedSum = normalisedBreakdown.reduce((acc, item) => acc + item.allocatedAmount, 0);
  const rounding = Math.round(targetTotal) - normalisedSum;
  const lastIdx = normalisedBreakdown.length - 1;
  const lastItem = normalisedBreakdown[lastIdx];
  if (lastItem !== undefined) {
    normalisedBreakdown[lastIdx] = {
      ...lastItem,
      allocatedAmount: lastItem.allocatedAmount + rounding,
    };
  }

  return {
    ...plan,
    totalEstimatedCost: Math.round(targetTotal),
    budgetBreakdown: normalisedBreakdown,
  };
}
