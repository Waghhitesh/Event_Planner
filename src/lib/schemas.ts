/**
 * @file schemas.ts
 * @description Zod validation schemas for EventPulse AI — client intake form
 * and Gemini structured JSON response.
 */

import { z } from "zod";

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

export const ClientIntakeSchema = z.object({
  eventType: EventTypeSchema,
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine((d) => !isNaN(Date.parse(d)), { message: "Invalid date format" })
    .refine((d) => new Date(d) > new Date(), {
      message: "Event date must be in the future",
    }),
  location: nonEmptyString(200),
  totalBudget: z
    .number({ message: "Total budget is required" })
    .positive("Budget must be positive")
    .max(10_000_000, "Budget exceeds maximum allowed value"),
  guestCount: z
    .number({ message: "Guest count is required" })
    .int("Guest count must be a whole number")
    .positive("Guest count must be at least 1")
    .max(100_000, "Guest count exceeds maximum"),
  themePreferences: nonEmptyString(500),
  specialRequirements: z.string().max(1000, "Maximum 1000 characters").default(""),
});

export type ClientIntake = z.infer<typeof ClientIntakeSchema>;

// ---------------------------------------------------------------------------
// Gemini Structured Response Schema (Zod mirror of the SchemaType definition)
// ---------------------------------------------------------------------------

export const BudgetBreakdownItemSchema = z.object({
  category: z.string(),
  allocatedAmount: z.number().nonnegative(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  costSavingTip: z.string(),
});
export type BudgetBreakdownItem = z.infer<typeof BudgetBreakdownItemSchema>;

export const TimelinePhaseSchema = z.object({
  phase: z.string(),
  daysBeforeEvent: z.number().int(),
  tasks: z.array(z.string()).min(1),
});
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;

export const VendorChecklistItemSchema = z.object({
  service: z.string(),
  estimatedCost: z.number().nonnegative(),
  vettingQuestions: z.array(z.string()).min(1),
  status: z.enum(["not_started", "researching", "contacted", "booked"]),
});
export type VendorChecklistItem = z.infer<typeof VendorChecklistItemSchema>;

export const PersonalizedIdeaSchema = z.object({
  idea: z.string(),
  implementationDetails: z.string(),
});
export type PersonalizedIdea = z.infer<typeof PersonalizedIdeaSchema>;

export const GeminiResponseSchema = z.object({
  eventName: z.string(),
  themeSummary: z.string(),
  totalEstimatedCost: z.number().nonnegative(),
  budgetBreakdown: z.array(BudgetBreakdownItemSchema).min(1),
  timeline: z.array(TimelinePhaseSchema).min(1),
  vendorChecklist: z.array(VendorChecklistItemSchema).min(1),
  personalizedIdeas: z.array(PersonalizedIdeaSchema).min(1),
});
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
