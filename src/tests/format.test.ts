/**
 * @file src/tests/format.test.ts
 * @description Unit tests for currency formatting and internationalisation.
 */

import { describe, it, expect } from "vitest";
import { formatCurrency } from "../lib/format";
import { ClientIntakeSchema } from "../lib/schemas";
import { VALID_INTAKE } from "./fixtures";

describe("formatCurrency", () => {
  it("formats INR correctly with rupee symbol and indian numbering", () => {
    const formatted = formatCurrency(500000, "INR");
    expect(formatted).toContain("5,00,000");
  });

  it("formats USD correctly with dollar symbol", () => {
    const formatted = formatCurrency(5000, "USD");
    expect(formatted).toMatch(/\$|USD/);
    expect(formatted).toContain("5,000");
  });

  it("formats EUR correctly", () => {
    const formatted = formatCurrency(3500, "EUR");
    expect(formatted).toMatch(/€|EUR/);
    expect(formatted).toContain("3.500");
  });

  it("formats GBP correctly with pound symbol", () => {
    const formatted = formatCurrency(2000, "GBP");
    expect(formatted).toMatch(/£|GBP/);
    expect(formatted).toContain("2,000");
  });

  it("defaults to INR when currency is not provided", () => {
    const formatted = formatCurrency(100000);
    expect(formatted).toContain("1,00,000");
  });

  it("falls back to en-IN locale for unknown currency", () => {
    const formatted = formatCurrency(100000, "JPY" as unknown as "INR");
    expect(formatted).toContain("1,00,000");
  });
});

describe("ClientIntakeSchema currency validation", () => {
  it("defaults currency to INR if omitted", () => {
    const parsed = ClientIntakeSchema.safeParse({
      ...VALID_INTAKE,
      currency: undefined,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("INR");
    }
  });

  it("accepts valid currency codes", () => {
    for (const curr of ["INR", "USD", "EUR", "GBP"] as const) {
      const parsed = ClientIntakeSchema.safeParse({
        ...VALID_INTAKE,
        currency: curr,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.currency).toBe(curr);
      }
    }
  });

  it("rejects invalid currency codes", () => {
    const parsed = ClientIntakeSchema.safeParse({
      ...VALID_INTAKE,
      currency: "XYZ",
    });
    expect(parsed.success).toBe(false);
  });
});
