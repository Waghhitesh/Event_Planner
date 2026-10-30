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
export function localToday(): string {
  return formatDateOnly(new Date());
}

/**
 * Returns tomorrow's date as a YYYY-MM-DD string (UTC-safe).
 * Use as the `min` attribute value for date inputs.
 */
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
  return dateStr > localToday();
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
