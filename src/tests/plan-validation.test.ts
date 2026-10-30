/**
 * @file src/tests/plan-validation.test.ts
 * @description Vitest unit tests for plan invariant validation and normalisation.
 */

import { describe, it, expect } from "vitest";
import { validatePlanInvariants, normalisePlan } from "../lib/plan-validation";
import { MOCK_PLAN, VALID_INTAKE } from "./fixtures";
import type { GeminiResponse } from "../lib/schemas";

describe("validatePlanInvariants — valid plan", () => {
  it("returns valid=true for a fully correct plan", () => {
    const result = validatePlanInvariants(MOCK_PLAN, VALID_INTAKE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validatePlanInvariants — budget arithmetic", () => {
  it("flags sum mismatch > 1% tolerance", () => {
    const badPlan: GeminiResponse = {
      ...MOCK_PLAN,
      totalEstimatedCost: 500000,
      budgetBreakdown: MOCK_PLAN.budgetBreakdown.map((item, i) =>
        i === 0 ? { ...item, allocatedAmount: 200000 } : item
      ),
    };
    const result = validatePlanInvariants(badPlan, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Budget sum mismatch"))).toBe(true);
  });

  it("passes when sum is within 1% tolerance", () => {
    // totalEstimatedCost = 500000, sum = 500000 → exact match passes
    const result = validatePlanInvariants(MOCK_PLAN, VALID_INTAKE);
    expect(result.valid).toBe(true);
  });
});

describe("validatePlanInvariants — over budget", () => {
  it("flags totalEstimatedCost exceeding intake totalBudget", () => {
    const overBudgetPlan: GeminiResponse = {
      ...MOCK_PLAN,
      totalEstimatedCost: 600000,
      budgetBreakdown: MOCK_PLAN.budgetBreakdown.map((item) => ({
        ...item,
        allocatedAmount: item.allocatedAmount * 1.2,
      })),
    };
    const result = validatePlanInvariants(overBudgetPlan, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("totalEstimatedCost"))).toBe(true);
  });
});

describe("validatePlanInvariants — minimums", () => {
  it("flags fewer than 6 timeline phases", () => {
    const shortTimeline: GeminiResponse = {
      ...MOCK_PLAN,
      timeline: MOCK_PLAN.timeline.slice(0, 3),
    };
    const result = validatePlanInvariants(shortTimeline, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Timeline"))).toBe(true);
  });

  it("requires only 4 minimum timeline phases when event is within 30 days", () => {
    // 20 days in future from today
    const nearFuture = new Date();
    nearFuture.setUTCDate(nearFuture.getUTCDate() + 20);
    const shortHorizonIntake = {
      ...VALID_INTAKE,
      eventDate: nearFuture.toISOString().slice(0, 10),
    };

    const fourPhasePlan: GeminiResponse = {
      ...MOCK_PLAN,
      timeline: [
        { phase: "Phase 1", daysBeforeEvent: 18, tasks: ["Task 1"] },
        { phase: "Phase 2", daysBeforeEvent: 10, tasks: ["Task 2"] },
        { phase: "Phase 3", daysBeforeEvent: 5, tasks: ["Task 3"] },
        { phase: "Phase 4", daysBeforeEvent: 0, tasks: ["Task 4"] },
      ],
    };

    const result = validatePlanInvariants(fourPhasePlan, shortHorizonIntake);
    expect(result.valid).toBe(true);
  });

  it("flags timeline phases with daysBeforeEvent exceeding available days or negative", () => {
    const nearFuture = new Date();
    nearFuture.setUTCDate(nearFuture.getUTCDate() + 15);
    const shortHorizonIntake = {
      ...VALID_INTAKE,
      eventDate: nearFuture.toISOString().slice(0, 10),
    };

    const outOfRangePlan: GeminiResponse = {
      ...MOCK_PLAN,
      timeline: [
        { phase: "Phase 1", daysBeforeEvent: 60, tasks: ["Task 1"] }, // 60 > 15
        { phase: "Phase 2", daysBeforeEvent: 10, tasks: ["Task 2"] },
        { phase: "Phase 3", daysBeforeEvent: 5, tasks: ["Task 3"] },
        { phase: "Phase 4", daysBeforeEvent: -2, tasks: ["Task 4"] }, // -2 < 0
      ],
    };

    const result = validatePlanInvariants(outOfRangePlan, shortHorizonIntake);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("daysBeforeEvent"))).toBe(true);
  });

  it("flags timeline phases that are not sorted in descending order", () => {
    const unsortedPlan: GeminiResponse = {
      ...MOCK_PLAN,
      timeline: [
        { phase: "Phase 1", daysBeforeEvent: 10, tasks: ["Task 1"] },
        { phase: "Phase 2", daysBeforeEvent: 20, tasks: ["Task 2"] }, // 20 > 10
        { phase: "Phase 3", daysBeforeEvent: 5, tasks: ["Task 3"] },
        { phase: "Phase 4", daysBeforeEvent: 0, tasks: ["Task 4"] },
        { phase: "Phase 5", daysBeforeEvent: 0, tasks: ["Task 5"] },
        { phase: "Phase 6", daysBeforeEvent: 0, tasks: ["Task 6"] },
      ],
    };

    const result = validatePlanInvariants(unsortedPlan, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("sorted descending"))).toBe(true);
  });

  it("flags fewer than 5 vendors", () => {
    const fewVendors: GeminiResponse = {
      ...MOCK_PLAN,
      vendorChecklist: MOCK_PLAN.vendorChecklist.slice(0, 2),
    };
    const result = validatePlanInvariants(fewVendors, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Vendor"))).toBe(true);
  });

  it("flags fewer than 4 personalised ideas", () => {
    const fewIdeas: GeminiResponse = {
      ...MOCK_PLAN,
      personalizedIdeas: MOCK_PLAN.personalizedIdeas.slice(0, 2),
    };
    const result = validatePlanInvariants(fewIdeas, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("ideas"))).toBe(true);
  });

  it("accumulates multiple errors when multiple invariants fail", () => {
    const badPlan: GeminiResponse = {
      ...MOCK_PLAN,
      totalEstimatedCost: 999999,
      timeline: MOCK_PLAN.timeline.slice(0, 2),
      vendorChecklist: MOCK_PLAN.vendorChecklist.slice(0, 1),
      personalizedIdeas: MOCK_PLAN.personalizedIdeas.slice(0, 1),
    };
    const result = validatePlanInvariants(badPlan, VALID_INTAKE);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
  });
});

describe("normalisePlan", () => {
  it("recomputes totalEstimatedCost as the sum of budget items", () => {
    const mismatchPlan: GeminiResponse = {
      ...MOCK_PLAN,
      totalEstimatedCost: 999999, // wrong
    };
    const normalised = normalisePlan(mismatchPlan, VALID_INTAKE);
    const sum = normalised.budgetBreakdown.reduce((a, b) => a + b.allocatedAmount, 0);
    expect(normalised.totalEstimatedCost).toBe(sum);
  });

  it("scales down budget items when sum exceeds user budget", () => {
    const overPlan: GeminiResponse = {
      ...MOCK_PLAN,
      totalEstimatedCost: 700000,
      budgetBreakdown: MOCK_PLAN.budgetBreakdown.map((item) => ({
        ...item,
        allocatedAmount: item.allocatedAmount * 1.4,
      })),
    };
    const normalised = normalisePlan(overPlan, VALID_INTAKE);
    expect(normalised.totalEstimatedCost).toBeLessThanOrEqual(VALID_INTAKE.totalBudget);
  });

  it("does not scale when sum is already within budget", () => {
    const normalised = normalisePlan(MOCK_PLAN, VALID_INTAKE);
    // Sum = 500000 = budget, so no scaling needed
    const sum = normalised.budgetBreakdown.reduce((a, b) => a + b.allocatedAmount, 0);
    expect(sum).toBe(MOCK_PLAN.totalEstimatedCost);
  });

  it("normalised budget breakdown items sum equals normalised totalEstimatedCost", () => {
    const badPlan: GeminiResponse = {
      ...MOCK_PLAN,
      totalEstimatedCost: 800000,
      budgetBreakdown: MOCK_PLAN.budgetBreakdown.map((item) => ({
        ...item,
        allocatedAmount: item.allocatedAmount * 1.6,
      })),
    };
    const normalised = normalisePlan(badPlan, VALID_INTAKE);
    const sum = normalised.budgetBreakdown.reduce((a, b) => a + b.allocatedAmount, 0);
    expect(sum).toBe(normalised.totalEstimatedCost);
  });

  it("all normalised allocatedAmounts are non-negative", () => {
    const normalised = normalisePlan(MOCK_PLAN, VALID_INTAKE);
    for (const item of normalised.budgetBreakdown) {
      expect(item.allocatedAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it("normalisePlan clamps daysBeforeEvent within [0, N] and sorts descending", () => {
    const nearFuture = new Date();
    nearFuture.setUTCDate(nearFuture.getUTCDate() + 15);
    const shortIntake = {
      ...VALID_INTAKE,
      eventDate: nearFuture.toISOString().slice(0, 10),
    };

    const messyTimelinePlan: GeminiResponse = {
      ...MOCK_PLAN,
      timeline: [
        { phase: "Past event day", daysBeforeEvent: -5, tasks: ["T1"] },
        { phase: "Way before", daysBeforeEvent: 100, tasks: ["T2"] },
        { phase: "Midway", daysBeforeEvent: 8, tasks: ["T3"] },
      ],
    };

    const normalised = normalisePlan(messyTimelinePlan, shortIntake);
    expect(normalised.timeline[0]?.daysBeforeEvent).toBe(15); // clamped from 100
    expect(normalised.timeline[1]?.daysBeforeEvent).toBe(8);
    expect(normalised.timeline[2]?.daysBeforeEvent).toBe(0); // clamped from -5
  });
});
