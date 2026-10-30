/**
 * @file google-integrations.ts
 * @description Zero-cost Google Ecosystem integrations for EventPulse AI.
 *
 *  • generateGoogleCalendarUrl  – 1-click "Add to Google Calendar" deep link
 *  • generateGoogleSheetsCsv    – Downloadable CSV pre-formatted for import
 *  • slugifyFilename             – Safe filename generation for downloads
 */

import type { GeminiResponse, Currency } from "./schemas";

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
function neutraliseFormula(value: string | number): string | number {
  if (typeof value !== "string") {
    return value;
  }
  if (/^[=\-+@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Escapes a value for RFC 4180-compliant CSV (handles commas, quotes, newlines).
 * Also neutralises spreadsheet formula injection on strings.
 */
function csvCell(value: string | number): string {
  const safe = neutraliseFormula(value);
  const str = String(safe);
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
 * Google Sheets. Sections: Budget Breakdown, Planning Timeline,
 * Vendor Checklist, Personalised Ideas.
 *
 * @param planData - Validated Gemini response object.
 * @param currency - Intake currency for headers.
 * @returns A string of RFC 4180 CSV content (CRLF line endings, UTF-8 BOM).
 */
export function generateGoogleSheetsCsv(
  planData: GeminiResponse,
  currency: Currency = "INR"
): string {
  const lines: string[] = [];

  lines.push(csvRow(["EventPulse AI — Event Plan Export"]));
  lines.push(csvRow(["Event Name", planData.eventName]));
  lines.push(csvRow(["Theme Summary", planData.themeSummary]));
  lines.push(csvRow([`Total Estimated Cost (${currency})`, planData.totalEstimatedCost]));
  lines.push("");

  // ── Budget Breakdown ────────────────────────────────────────────────────
  lines.push(csvRow(["BUDGET BREAKDOWN"]));
  lines.push(csvRow(["Category", `Allocated Amount (${currency})`, "Priority", "Cost Saving Tip"]));

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
  lines.push(csvRow(["Service", `Estimated Cost (${currency})`, "Status", "Vetting Questions"]));

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

  return "\uFEFF" + lines.join("\r\n"); // UTF-8 BOM + CRLF per RFC 4180
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

// ---------------------------------------------------------------------------
// RFC 5545 iCalendar (.ics) export
// ---------------------------------------------------------------------------

/**
 * Escapes characters with special meaning in iCalendar (RFC 5545).
 * Characters: backslash, semicolon, comma, and newlines.
 */
function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Generates an RFC 5545-compliant iCalendar (.ics) string containing all-day
 * events for every timeline phase, scheduled relative to the event date.
 *
 * @param planData  - Validated Gemini response object.
 * @param eventDate - ISO 8601 date string (YYYY-MM-DD).
 * @returns RFC 5545 formatted .ics calendar content with CRLF line endings.
 */
export function generateIcs(planData: GeminiResponse, eventDate: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatIcsDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

  const baseDate = new Date(eventDate);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventPulse AI//Event Planning Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  planData.timeline.forEach((phase, index) => {
    const phaseDate = new Date(baseDate);
    phaseDate.setUTCDate(phaseDate.getUTCDate() - phase.daysBeforeEvent);

    const startDateStr = formatIcsDate(phaseDate);
    const nextDay = new Date(phaseDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const endDateStr = formatIcsDate(nextDay);

    const uid = `${slugifyFilename(planData.eventName)}-phase-${index}-${startDateStr}@eventpulse.ai`;
    const summary = `${planData.eventName}: ${phase.phase}`;
    const description = phase.tasks.map((t) => `- ${t}`).join("\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${startDateStr}`);
    lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
