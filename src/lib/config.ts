/**
 * @file config.ts
 * @description Single source of truth for EventPulse AI runtime constants.
 * Import from here instead of hard-coding values across the codebase.
 */

// ---------------------------------------------------------------------------
// Gemini model
// ---------------------------------------------------------------------------

/** Default Gemini model name used when GEMINI_MODEL env var is not set. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash" as const;

/** Human-readable display name shown in UI and docs. */
export const MODEL_DISPLAY_NAME = "Gemini Flash" as const;

// ---------------------------------------------------------------------------
// Input / request limits
// ---------------------------------------------------------------------------

export const LIMITS = {
  /** Maximum characters accepted from any single free-text user field. */
  MAX_FIELD_LENGTH: 2_000,

  /** Maximum characters for theme preferences field. */
  THEME_FIELD_MAX: 500,

  /** Maximum characters for special requirements field. */
  SPECIAL_REQS_MAX: 1_000,

  /** Maximum characters for location field. */
  LOCATION_MAX: 200,

  /** Maximum total budget accepted (in user's currency units). */
  MAX_BUDGET: 10_000_000,

  /** Maximum guest count accepted. */
  MAX_GUESTS: 100_000,

  /** Approximate request body size limit (bytes) before a 413 is returned. */
  MAX_BODY_BYTES: 10_240,

  /** Sliding-window rate limit: max requests per IP per window. */
  RATE_LIMIT_MAX: 5,

  /** Sliding-window rate limit: window duration in milliseconds. */
  RATE_LIMIT_WINDOW_MS: 60_000,

  /** In-memory plan cache TTL in milliseconds (10 minutes). */
  CACHE_TTL_MS: 10 * 60 * 1_000,

  /** Maximum number of entries in the in-memory LRU cache. */
  CACHE_MAX_SIZE: 100,
} as const;

// ---------------------------------------------------------------------------
// Plan quality thresholds (used by validatePlanInvariants)
// ---------------------------------------------------------------------------

export const PLAN_THRESHOLDS = {
  /** Minimum number of planning timeline phases. */
  MIN_TIMELINE_PHASES: 6,

  /** Minimum number of vendor checklist entries. */
  MIN_VENDORS: 5,

  /** Minimum number of personalised ideas. */
  MIN_IDEAS: 4,

  /** Allowed deviation between sum of budget items and totalEstimatedCost (fraction). */
  BUDGET_TOLERANCE: 0.01,
} as const;
