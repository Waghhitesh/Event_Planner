/**
 * @file src/tests/google-integrations.test.ts
 * @description Vitest unit tests for Google Calendar URL builder and CSV export.
 */

import { describe, it, expect } from "vitest";
import {
  generateGoogleCalendarUrl,
  generateGoogleSheetsCsv,
  slugifyFilename,
} from "../lib/google-integrations";
import { MOCK_PLAN } from "./fixtures";

describe("generateGoogleCalendarUrl", () => {
  const url = generateGoogleCalendarUrl(
    "Our Dream Wedding",
    "2027-06-15",
    "An intimate ceremony in Mumbai",
    "Grand Ballroom, Mumbai"
  );

  it("returns a string starting with the Google Calendar base URL", () => {
    expect(url).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render/);
  });

  it("contains action=TEMPLATE parameter", () => {
    expect(url).toContain("action=TEMPLATE");
  });

  it("encodes the event title in the URL", () => {
    const parsed = new URL(url);
    expect(parsed.searchParams.get("text")).toBe("Our Dream Wedding");
  });

  it("contains a dates parameter with YYYYMMDD format", () => {
    expect(url).toMatch(/dates=\d{8}%2F\d{8}|dates=\d{8}\/\d{8}/);
  });

  it("contains a location parameter when provided", () => {
    const parsed = new URL(url);
    expect(parsed.searchParams.get("location")).toBe("Grand Ballroom, Mumbai");
  });

  it("produces a valid URL that can be parsed", () => {
    expect(() => new URL(url)).not.toThrow();
  });

  it("works without optional location parameter", () => {
    const noLocUrl = generateGoogleCalendarUrl(
      "Birthday Party",
      "2027-03-20",
      "A fun birthday party"
    );
    expect(() => new URL(noLocUrl)).not.toThrow();
    expect(noLocUrl).toContain("action=TEMPLATE");
    const parsed = new URL(noLocUrl);
    expect(parsed.searchParams.get("location")).toBeNull();
  });

  it("uses UTC date to avoid timezone off-by-one", () => {
    // 2027-06-15 UTC should always produce 20270615 regardless of local TZ
    expect(url).toContain("20270615");
  });
});

describe("generateGoogleSheetsCsv", () => {
  const csv = generateGoogleSheetsCsv(MOCK_PLAN);

  it("returns a non-empty string starting with UTF-8 BOM", () => {
    expect(csv.length).toBeGreaterThan(0);
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("uses CRLF line endings per RFC 4180", () => {
    expect(csv).toContain("\r\n");
  });

  it("contains currency in column headers", () => {
    expect(csv).toContain("Total Estimated Cost (INR)");
    expect(csv).toContain("Allocated Amount (INR)");
    expect(csv).toContain("Estimated Cost (INR)");
  });

  it("exports raw numbers in money cells instead of formatted strings", () => {
    // Total cost row contains raw number
    expect(csv).toContain(`Total Estimated Cost (INR),${MOCK_PLAN.totalEstimatedCost}`);
    // First budget breakdown line contains raw allocated amount
    const firstBudget = MOCK_PLAN.budgetBreakdown[0]!;
    expect(csv).toContain(`${firstBudget.category},${firstBudget.allocatedAmount},`);
    // First vendor item contains raw estimated cost
    const firstVendor = MOCK_PLAN.vendorChecklist[0]!;
    expect(csv).toContain(`${firstVendor.service},${firstVendor.estimatedCost},`);
  });

  it("contains BUDGET BREAKDOWN section header", () => {
    expect(csv).toContain("BUDGET BREAKDOWN");
  });

  it("contains PLANNING TIMELINE section header", () => {
    expect(csv).toContain("PLANNING TIMELINE");
  });

  it("contains VENDOR CHECKLIST section header", () => {
    expect(csv).toContain("VENDOR CHECKLIST");
  });

  it("contains PERSONALISED IDEAS section header", () => {
    expect(csv).toContain("PERSONALISED IDEAS");
  });

  it("includes the event name", () => {
    expect(csv).toContain(MOCK_PLAN.eventName);
  });

  it("includes all category names in the CSV", () => {
    for (const item of MOCK_PLAN.budgetBreakdown) {
      expect(csv).toContain(item.category);
    }
  });

  it("properly quotes cells containing commas", () => {
    const csvWithComma = generateGoogleSheetsCsv({
      ...MOCK_PLAN,
      eventName: "Test, Event",
    });
    expect(csvWithComma).toContain('"Test, Event"');
  });

  it("neutralises spreadsheet formula injection — cells starting with '='", () => {
    const evilPlan = {
      ...MOCK_PLAN,
      eventName: "=SUM(A1:A10)",
    };
    const evilCsv = generateGoogleSheetsCsv(evilPlan);
    // Formula should be prefixed with a single quote to neutralise it
    expect(evilCsv).toContain("'=SUM(A1:A10)");
    expect(evilCsv).not.toMatch(/,=SUM/);
  });

  it("neutralises formula injection starting with '-'", () => {
    const evilPlan = {
      ...MOCK_PLAN,
      budgetBreakdown: [
        {
          category: "-1+2",
          allocatedAmount: 100,
          priority: "low" as const,
          costSavingTip: "tip",
        },
      ],
    };
    const evilCsv = generateGoogleSheetsCsv(evilPlan);
    expect(evilCsv).toContain("'-1+2");
  });

  it("neutralises formula injection starting with '@'", () => {
    const evilPlan = {
      ...MOCK_PLAN,
      budgetBreakdown: [
        {
          category: "@SUM",
          allocatedAmount: 100,
          priority: "low" as const,
          costSavingTip: "tip",
        },
      ],
    };
    const evilCsv = generateGoogleSheetsCsv(evilPlan);
    expect(evilCsv).toContain("'@SUM");
  });

  it("does not neutralise numbers when negative", () => {
    const numericPlan = {
      ...MOCK_PLAN,
      budgetBreakdown: [
        {
          category: "Rebate",
          allocatedAmount: -500,
          priority: "low" as const,
          costSavingTip: "tip",
        },
      ],
    };
    const outCsv = generateGoogleSheetsCsv(numericPlan);
    // Negative number cell should NOT have single quote prefix
    expect(outCsv).toContain("Rebate,-500,");
    expect(outCsv).not.toContain("Rebate,'-500,");
  });
});

describe("slugifyFilename", () => {
  it("replaces slashes with underscores", () => {
    expect(slugifyFilename("Event/Name")).toBe("Event_Name");
  });

  it("replaces backslashes with underscores", () => {
    expect(slugifyFilename("Event\\Name")).toBe("Event_Name");
  });

  it("replaces colons with underscores", () => {
    expect(slugifyFilename("Event: Summer 2027")).toBe("Event_Summer_2027");
  });

  it("collapses multiple spaces into single underscore", () => {
    expect(slugifyFilename("A   B   C")).toBe("A_B_C");
  });

  it("trims leading and trailing underscores", () => {
    expect(slugifyFilename("_hello_world_")).toBe("hello_world");
  });

  it("caps length at 80 characters", () => {
    const long = "A".repeat(200);
    expect(slugifyFilename(long).length).toBeLessThanOrEqual(80);
  });

  it("produces a safe filename for a typical event name", () => {
    const name = "Waghhitesh & Priya's Dream Wedding";
    const slug = slugifyFilename(name);
    // No filesystem-dangerous characters
    expect(slug).not.toMatch(/[/\\:*?"<>|]/);
  });
});
