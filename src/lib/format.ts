/**
 * @file format.ts
 * @description International currency formatting utilities for EventPulse AI.
 */

import type { Currency } from "./schemas";

const CURRENCY_LOCALES: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

/**
 * Formats a numeric amount with the appropriate currency symbol and grouping.
 * @param amount - Numeric amount to format
 * @param currency - 3-letter currency code ("INR" | "USD" | "EUR" | "GBP")
 */
export function formatCurrency(amount: number, currency: Currency = "INR"): string {
  const locale = CURRENCY_LOCALES[currency] ?? "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
