/**
 * @file schemas.ts
 * @description Zod validation schemas for EventPulse AI — client intake form
 * and Gemini structured JSON response.
 */

import { z } from "zod";
import { LIMITS } from "./config";
import { isFutureDate, DATE_PATTERN } from "./date";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const nonEmptyString = (max = 500) =>
  z.string().min(1, "Field is required").max(max, `Maximum ${max} characters`);

// ---------------------------------------------------------------------------
// Client Intake Form Schema
// ---------------------------------------------------------------------------

export const EventTypeSchema = z.enum(["wedding", "birthday", "community"], {
  message: "Event type must be wedding, birthday, or community",
});
export type EventType = z.infer<typeof EventTypeSchema>;

export const CurrencySchema = z.enum(["INR", "USD", "EUR", "GBP"]).default("INR");
export type Currency = z.infer<typeof CurrencySchema>;

export const ClientIntakeSchema = z.object({
  eventType: EventTypeSchema,
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .regex(DATE_PATTERN, "Date must be in YYYY-MM-DD format")
    .refine(isFutureDate, { message: "Event date must be in the future" }),
  location: nonEmptyString(LIMITS.LOCATION_MAX),
  currency: CurrencySchema,
  totalBudget: z
    .number({ message: "Total budget is required" })
    .positive("Budget must be positive")
    .max(LIMITS.MAX_BUDGET, "Budget exceeds maximum allowed value"),
  guestCount: z
    .number({ message: "Guest count is required" })
    .int("Guest count must be a whole number")
    .positive("Guest count must be at least 1")
    .max(LIMITS.MAX_GUESTS, "Guest count exceeds maximum"),
  themePreferences: nonEmptyString(LIMITS.THEME_FIELD_MAX),
  specialRequirements: z
    .string()
    .max(LIMITS.SPECIAL_REQS_MAX, `Maximum ${LIMITS.SPECIAL_REQS_MAX} characters`)
    .default(""),
});

export type ClientIntake = z.infer<typeof ClientIntakeSchema>;

// ---------------------------------------------------------------------------
// Gemini Structured Response Schema (Zod mirror of the SchemaType definition)
// ---------------------------------------------------------------------------

const MAX_STR = 2_000;
const MAX_ARRAY = 20;

export const BudgetBreakdownItemSchema = z.object({
  category: z.string().max(MAX_STR),
  allocatedAmount: z.number().nonnegative(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  costSavingTip: z.string().max(MAX_STR),
});
export type BudgetBreakdownItem = z.infer<typeof BudgetBreakdownItemSchema>;

export const TimelinePhaseSchema = z.object({
  phase: z.string().max(MAX_STR),
  daysBeforeEvent: z.number().int(),
  tasks: z.array(z.string().max(MAX_STR)).min(1).max(MAX_ARRAY),
});
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;

export const VendorChecklistItemSchema = z.object({
  service: z.string().max(MAX_STR),
  estimatedCost: z.number().nonnegative(),
  vettingQuestions: z.array(z.string().max(MAX_STR)).min(1).max(MAX_ARRAY),
  status: z.enum(["not_started", "researching", "contacted", "booked"]),
});
export type VendorChecklistItem = z.infer<typeof VendorChecklistItemSchema>;

export const PersonalizedIdeaSchema = z.object({
  idea: z.string().max(MAX_STR),
  implementationDetails: z.string().max(MAX_STR),
});
export type PersonalizedIdea = z.infer<typeof PersonalizedIdeaSchema>;

export const GeminiResponseSchema = z.object({
  eventName: z.string().max(MAX_STR),
  themeSummary: z.string().max(MAX_STR),
  totalEstimatedCost: z.number().nonnegative(),
  budgetBreakdown: z.array(BudgetBreakdownItemSchema).min(1).max(MAX_ARRAY),
  timeline: z.array(TimelinePhaseSchema).min(1).max(MAX_ARRAY),
  vendorChecklist: z.array(VendorChecklistItemSchema).min(1).max(MAX_ARRAY),
  personalizedIdeas: z.array(PersonalizedIdeaSchema).min(1).max(MAX_ARRAY),
});
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
