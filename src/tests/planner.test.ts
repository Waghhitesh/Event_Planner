/**
 * @file src/tests/planner.test.ts
 * @description Legacy test entry point — all tests migrated to per-module files.
 * This file is kept so existing CI references to "planner.test.ts" still find tests.
 * The actual tests live in:
 *   - security.test.ts
 *   - schemas.test.ts
 *   - google-integrations.test.ts
 *   - plan-validation.test.ts
 *   - prompt.test.ts
 *   - route.test.ts
 */

// Re-export all test suites so this file shows up in coverage reports
export * from "./security.test";
export * from "./schemas.test";
export * from "./google-integrations.test";
export * from "./plan-validation.test";
export * from "./prompt.test";
