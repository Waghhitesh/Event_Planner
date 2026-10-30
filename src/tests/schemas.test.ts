/**
 * @file src/tests/schemas.test.ts
 * @description Vitest unit tests for Zod validation schemas.
 */

import { describe, it, expect } from "vitest";
import { ClientIntakeSchema, GeminiResponseSchema } from "../lib/schemas";
import { MOCK_PLAN } from "./fixtures";

const VALID_INTAKE = {
  eventType: "wedding" as const,
  eventDate: "2027-06-15",
  location: "Grand Ballroom, Mumbai",
  totalBudget: 500000,
  guestCount: 150,
  themePreferences: "Rustic bohemian with fairy lights",
  specialRequirements: "Vegan menu options required",
};

describe("ClientIntakeSchema", () => {
  it("accepts a valid intake object", () => {
    const result = ClientIntakeSchema.safeParse(VALID_INTAKE);
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, eventType: "concert" });
    expect(result.success).toBe(false);
  });

  it("rejects past event date", () => {
    const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, eventDate: "2020-01-01" });
    expect(result.success).toBe(false);
  });

  it("rejects date not in YYYY-MM-DD format", () => {
    const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, eventDate: "15/06/2027" });
    expect(result.success).toBe(false);
  });

  it("rejects zero totalBudget", () => {
    const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, totalBudget: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative guestCount", () => {
    const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, guestCount: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects empty location", () => {
    const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, location: "" });
    expect(result.success).toBe(false);
  });

  it("defaults specialRequirements to empty string when omitted", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { specialRequirements: _unused, ...withoutSpecial } = VALID_INTAKE;
    const result = ClientIntakeSchema.safeParse(withoutSpecial);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialRequirements).toBe("");
    }
  });

  it("accepts all three valid event types", () => {
    for (const eventType of ["wedding", "birthday", "community"] as const) {
      const result = ClientIntakeSchema.safeParse({ ...VALID_INTAKE, eventType });
      expect(result.success).toBe(true);
    }
  });
});

describe("GeminiResponseSchema", () => {
  it("validates a valid plan", () => {
    const result = GeminiResponseSchema.safeParse(MOCK_PLAN);
    expect(result.success).toBe(true);
  });

  it("rejects negative allocatedAmount", () => {
    const bad = {
      ...MOCK_PLAN,
      budgetBreakdown: [
        { category: "X", allocatedAmount: -1, priority: "low", costSavingTip: "tip" },
      ],
    };
    const result = GeminiResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority enum value", () => {
    const bad = {
      ...MOCK_PLAN,
      budgetBreakdown: [
        { category: "X", allocatedAmount: 100, priority: "urgent", costSavingTip: "tip" },
      ],
    };
    expect(GeminiResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid vendor status", () => {
    const bad = {
      ...MOCK_PLAN,
      vendorChecklist: [
        {
          ...MOCK_PLAN.vendorChecklist[0],
          status: "pending",
        },
      ],
    };
    expect(GeminiResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("has the same required top-level keys as the Gemini SchemaType definition", async () => {
    // Dynamically import to check the SDK responseSchema matches Zod keys
    const { responseSchema } = await import("../lib/gemini");
    const zodKeys = Object.keys(GeminiResponseSchema.shape).sort();
    // The SDK schema properties object should have the same keys as the Zod schema
    const sdkSchema = responseSchema as { properties?: Record<string, unknown> };
    const sdkKeys = Object.keys(sdkSchema.properties ?? {}).sort();
    expect(sdkKeys).toEqual(zodKeys);
  });
});
