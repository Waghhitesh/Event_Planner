/**
 * @file google-integrations.ts
 * @description Zero-cost Google Ecosystem integrations for EventPulse AI.
 *
 *  • generateGoogleCalendarUrl  – 1-click "Add to Google Calendar" deep link
 *  • generateGoogleSheetsCsv    – Downloadable CSV pre-formatted for import
 *  • slugifyFilename             – Safe filename generation for downloads
 */

import type { GeminiResponse } from "./schemas";

// ---------------------------------------------------------------------------
// Google Calendar
// ---------------------------------------------------------------------------

/**
 * Builds a Google Calendar event creation URL that pre-fills all fields.
 * The user clicks the link, reviews the pre-filled event, and saves — zero
 * OAuth flow required.
 *
 * @param title      - Event name / title.
 * @param startDate  - ISO 8601 date-only string (YYYY-MM-DD).
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

  // Parse as UTC to avoid timezone off-by-one shifts
  const dateObj = new Date(startDate);
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = dateObj.getUTCFullYear();
  const month = pad(dateObj.getUTCMonth() + 1);
  const day = pad(dateObj.getUTCDate());

  // All-day event: YYYYMMDD/YYYYMMDD (exclusive end = next day)
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

/**
 * Neutralises spreadsheet formula injection by prefixing cells that start
 * with `=`, `-`, `+`, `@`, tab (`\t`), or CR (`\r`) with a single quote.
 * RFC 4180 quoting is still applied on top of this.
 *
 * @param value - A string or number cell value.
 * @returns A safe string representation.
 */
function neutraliseFormula(value: string | number): string {
  const str = String(value);
  if (/^[=\-+@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes a value for RFC 4180-compliant CSV (handles commas, quotes, newlines).
 * Also neutralises spreadsheet formula injection.
 */
function csvCell(value: string | number): string {
  const safe = neutraliseFormula(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/** Joins an array of values into a single CSV row string. */
function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * Generates a multi-section CSV document ready for direct import into
 * Google Sheets. Sections: Budget Breakdown, Planning Timeline,
 * Vendor Checklist, Personalised Ideas.
 *
 * @param planData - Validated Gemini response object.
 * @returns A string of RFC 4180 CSV content (CRLF line endings, UTF-8).
 */
export function generateGoogleSheetsCsv(planData: GeminiResponse): string {
  const lines: string[] = [];

  lines.push(csvRow(["EventPulse AI — Event Plan Export"]));
  lines.push(csvRow(["Event Name", planData.eventName]));
  lines.push(csvRow(["Theme Summary", planData.themeSummary]));
  lines.push(csvRow(["Total Estimated Cost", planData.totalEstimatedCost]));
  lines.push("");

  // ── Budget Breakdown ────────────────────────────────────────────────────
  lines.push(csvRow(["BUDGET BREAKDOWN"]));
  lines.push(csvRow(["Category", "Allocated Amount", "Priority", "Cost Saving Tip"]));

  let budgetTotal = 0;
  for (const item of planData.budgetBreakdown) {
    lines.push(csvRow([item.category, item.allocatedAmount, item.priority, item.costSavingTip]));
    budgetTotal += item.allocatedAmount;
  }
  lines.push(csvRow(["TOTAL", budgetTotal, "", ""]));
  lines.push("");

  // ── Planning Timeline ───────────────────────────────────────────────────
  lines.push(csvRow(["PLANNING TIMELINE"]));
  lines.push(csvRow(["Phase", "Days Before Event", "Task"]));

  for (const phase of planData.timeline) {
    for (const task of phase.tasks) {
      lines.push(csvRow([phase.phase, phase.daysBeforeEvent, task]));
    }
  }
  lines.push("");

  // ── Vendor Checklist ────────────────────────────────────────────────────
  lines.push(csvRow(["VENDOR CHECKLIST"]));
  lines.push(csvRow(["Service", "Estimated Cost", "Status", "Vetting Questions"]));

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
  lines.push("");

  // ── Personalised Ideas ──────────────────────────────────────────────────
  lines.push(csvRow(["PERSONALISED IDEAS"]));
  lines.push(csvRow(["Idea", "Implementation Details"]));

  for (const idea of planData.personalizedIdeas) {
    lines.push(csvRow([idea.idea, idea.implementationDetails]));
  }

  return lines.join("\r\n"); // CRLF per RFC 4180
}

/**
 * Converts an event name into a safe filename slug by replacing characters
 * that are illegal or problematic on common filesystems (/ \ : * ? " < > |)
 * and collapsing runs of whitespace/underscores.
 *
 * @param name - Raw event name string.
 * @returns A filesystem-safe slug suitable for use in a download filename.
 */
export function slugifyFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}
