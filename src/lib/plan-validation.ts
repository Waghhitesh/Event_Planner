/**
 * @file plan-validation.ts
 * @description Post-generation plan invariant validation and normalisation
 * for EventPulse AI. Ensures arithmetic consistency and quality minimums
 * before returning a plan to the client.
 */

import type { GeminiResponse } from "./schemas";
import type { ClientIntake } from "./schemas";
import { PLAN_THRESHOLDS } from "./config";
import { daysUntilEvent } from "./date";

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
  const tolerance = Math.max(plan.totalEstimatedCost * PLAN_THRESHOLDS.BUDGET_TOLERANCE, 1);
  if (diff > tolerance) {
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

  // 2b. Vendor cost sum must not exceed user's budget
  const vendorCostSum = plan.vendorChecklist.reduce((acc, v) => acc + v.estimatedCost, 0);
  if (vendorCostSum > intake.totalBudget) {
    errors.push(
      `Vendor checklist cost sum (${vendorCostSum}) exceeds user's totalBudget (${intake.totalBudget})`
    );
  }

  // 3. Minimum timeline phases
  const N = daysUntilEvent(intake.eventDate);
  const minPhases = N < 30 ? 4 : PLAN_THRESHOLDS.MIN_TIMELINE_PHASES;
  if (plan.timeline.length < minPhases) {
    errors.push(`Timeline has ${plan.timeline.length} phases; minimum required is ${minPhases}`);
  }

  // 3b. Timeline range and ordering check
  let isSortedDescending = true;
  for (let i = 0; i < plan.timeline.length; i++) {
    const current = plan.timeline[i];
    if (current && (current.daysBeforeEvent < 0 || current.daysBeforeEvent > N)) {
      errors.push(
        `Timeline phase '${current.phase}' daysBeforeEvent (${current.daysBeforeEvent}) must be between 0 and ${N}`
      );
    }
    if (i > 0) {
      const prev = plan.timeline[i - 1];
      if (prev && current && current.daysBeforeEvent > prev.daysBeforeEvent) {
        isSortedDescending = false;
      }
    }
  }

  if (!isSortedDescending) {
    errors.push("Timeline phases must be sorted descending by daysBeforeEvent");
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

  const normalisedVendors = plan.vendorChecklist.map((vendor) => ({
    ...vendor,
    estimatedCost: Math.round(vendor.estimatedCost * scaleFactor),
  }));

  const N = daysUntilEvent(intake.eventDate);
  const normalisedTimeline = [...plan.timeline]
    .map((phase) => ({
      ...phase,
      daysBeforeEvent: Math.max(0, Math.min(N, phase.daysBeforeEvent)),
    }))
    .sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);

  return {
    ...plan,
    totalEstimatedCost: Math.round(targetTotal),
    budgetBreakdown: normalisedBreakdown,
    timeline: normalisedTimeline,
    vendorChecklist: normalisedVendors,
  };
}
