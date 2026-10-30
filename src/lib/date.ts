/**
 * @file date.ts
 * @description Timezone-safe date helpers for EventPulse AI.
 * All helpers treat date-only strings (YYYY-MM-DD) as UTC to avoid
 * off-by-one day errors caused by local timezone offsets.
 */

/** ISO 8601 date-only pattern (YYYY-MM-DD). */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns today's date as a YYYY-MM-DD string evaluated in UTC.
 * Safe to call on both server and client.
 */
export function utcToday(): string {
  return formatDateOnly(new Date());
}

/** Backwards-compatible alias for utcToday. */
export function tomorrowDateString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return formatDateOnly(d);
}

/**
 * Returns `true` if the given YYYY-MM-DD string represents a date
 * strictly after today (UTC).
 *
 * @param dateStr - A string in YYYY-MM-DD format.
 */
export function isFutureDate(dateStr: string): boolean {
  if (!DATE_PATTERN.test(dateStr)) return false;
  // Compare as strings — YYYY-MM-DD lexicographic order == chronological order.
  return dateStr > utcToday();
}

/**
 * Validates that a string is a real calendar date in YYYY-MM-DD format.
 * Guards against non-existent dates like February 31 or month 13 via round-trip format.
 */
export function isRealDate(str: string): boolean {
  if (!DATE_PATTERN.test(str)) return false;
  const d = new Date(str);
  if (isNaN(d.getTime())) return false;
  return formatDateOnly(d) === str;
}

/**
 * Returns true if the date is within max horizon (defaults to 5 years from today UTC).
 */
export function isWithinMaxHorizon(str: string, maxYears = 5): boolean {
  if (!isRealDate(str)) return false;
  const maxDate = new Date();
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + maxYears);
  return str <= formatDateOnly(maxDate);
}

/**
 * Calculates days remaining until the target event date (UTC-based).
 * @param eventDateStr - Target date in YYYY-MM-DD
 * @param fromDateStr - Reference date in YYYY-MM-DD (defaults to utcToday())
 */
export function daysUntilEvent(eventDateStr: string, fromDateStr: string = utcToday()): number {
  const fromMs = Date.parse(fromDateStr);
  const targetMs = Date.parse(eventDateStr);
  if (isNaN(fromMs) || isNaN(targetMs)) return 0;
  const diffMs = targetMs - fromMs;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Formats a Date object or YYYY-MM-DD string into a human-readable date string
 * using the `en-IN` locale with `timeZone: "UTC"` to avoid off-by-one issues.
 *
 * @param date - A Date object or YYYY-MM-DD string.
 * @param locale - BCP 47 locale string (defaults to "en-IN").
 * @returns A locale-formatted date string, e.g. "15 June 2027".
 */
export function formatDateDisplay(date: Date | string, locale = "en-IN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { dateStyle: "long", timeZone: "UTC" });
}

/**
 * Formats a Date object into a YYYY-MM-DD string using UTC values.
 *
 * @param date - The Date to format.
 */
export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
