/**
 * @file google-integrations.ts
 * @description Zero-cost Google Ecosystem integrations for EventPulse AI.
 *
 *  • generateGoogleCalendarUrl  – 1-click "Add to Google Calendar" deep link
 *  • generateGoogleSheetsCsv    – Downloadable CSV pre-formatted for import
 */

import type { GeminiResponse, BudgetBreakdownItem, TimelinePhase } from "./schemas";

// ---------------------------------------------------------------------------
// Google Calendar
// ---------------------------------------------------------------------------

/**
 * Builds a Google Calendar event creation URL that pre-fills all fields.
 * The user clicks the link, reviews the pre-filled event, and saves — zero
 * OAuth flow required.
 *
 * @param title      - Event name / title.
 * @param startDate  - ISO 8601 date string (YYYY-MM-DD or full ISO).
 * @param details    - Optional free-text event description.
 * @param location   - Optional event location string.
 * @returns A fully-encoded Google Calendar "add event" URL.
 */
export function generateGoogleCalendarUrl(
  title: string,
  startDate: string,
  details: string,
  location?: string
): string {
  const base = "https://calendar.google.com/calendar/render";

  // Google Calendar expects dates in YYYYMMDDTHHmmssZ or YYYYMMDD format
  const dateObj = new Date(startDate);
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = dateObj.getUTCFullYear();
  const month = pad(dateObj.getUTCMonth() + 1);
  const day = pad(dateObj.getUTCDate());

  // All-day event: use YYYYMMDD/YYYYMMDD (next day as end)
  const nextDay = new Date(dateObj);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextYear = nextDay.getUTCFullYear();
  const nextMonth = pad(nextDay.getUTCMonth() + 1);
  const nextDayStr = pad(nextDay.getUTCDate());

  const dateParam = `${year}${month}${day}/${nextYear}${nextMonth}${nextDayStr}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: dateParam,
    details,
    ...(location ? { location } : {}),
  });

  return `${base}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Google Sheets CSV export
// ---------------------------------------------------------------------------

/** Escapes a value for RFC 4180-compliant CSV (handles commas, quotes, newlines). */
function csvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Joins an array of values into a single CSV row string. */
function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * Generates a multi-section CSV document ready for direct import into
 * Google Sheets. Two sections are produced:
 *
 *  1. **Budget Breakdown** — category, allocated amount, priority, saving tip
 *  2. **Planning Timeline** — phase, days before event, tasks (one per row)
 *
 * @param planData - Validated Gemini response object.
 * @returns A string of RFC 4180 CSV content (UTF-8).
 */
export function generateGoogleSheetsCsv(planData: GeminiResponse): string {
  const lines: string[] = [];

  // ── Section header ──────────────────────────────────────────────────────
  lines.push(csvRow(["EventPulse AI — Event Plan Export"]));
  lines.push(csvRow(["Event Name", planData.eventName]));
  lines.push(csvRow(["Theme Summary", planData.themeSummary]));
  lines.push(csvRow(["Total Estimated Cost", planData.totalEstimatedCost]));
  lines.push(""); // blank separator row

  // ── Budget Breakdown ────────────────────────────────────────────────────
  lines.push(csvRow(["BUDGET BREAKDOWN"]));
  lines.push(
    csvRow(["Category", "Allocated Amount", "Priority", "Cost Saving Tip"])
  );

  let budgetTotal = 0;
  for (const item of planData.budgetBreakdown as BudgetBreakdownItem[]) {
    lines.push(
      csvRow([
        item.category,
        item.allocatedAmount,
        item.priority,
        item.costSavingTip,
      ])
    );
    budgetTotal += item.allocatedAmount;
  }
  lines.push(csvRow(["TOTAL", budgetTotal, "", ""]));
  lines.push(""); // blank separator row

  // ── Planning Timeline ───────────────────────────────────────────────────
  lines.push(csvRow(["PLANNING TIMELINE"]));
  lines.push(csvRow(["Phase", "Days Before Event", "Task"]));

  for (const phase of planData.timeline as TimelinePhase[]) {
    // Emit one row per task within the phase for easy filtering in Sheets
    for (const task of phase.tasks) {
      lines.push(csvRow([phase.phase, phase.daysBeforeEvent, task]));
    }
  }
  lines.push(""); // blank separator row

  // ── Vendor Checklist ────────────────────────────────────────────────────
  lines.push(csvRow(["VENDOR CHECKLIST"]));
  lines.push(
    csvRow(["Service", "Estimated Cost", "Status", "Vetting Questions"])
  );

  for (const vendor of planData.vendorChecklist) {
    lines.push(
      csvRow([
        vendor.service,
        vendor.estimatedCost,
        vendor.status,
        vendor.vettingQuestions.join(" | "),
      ])
    );
  }
  lines.push(""); // blank separator row

  // ── Personalised Ideas ──────────────────────────────────────────────────
  lines.push(csvRow(["PERSONALISED IDEAS"]));
  lines.push(csvRow(["Idea", "Implementation Details"]));

  for (const idea of planData.personalizedIdeas) {
    lines.push(csvRow([idea.idea, idea.implementationDetails]));
  }

  return lines.join("\r\n"); // CRLF per RFC 4180
}
