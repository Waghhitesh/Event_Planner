/**
 * @file logger.ts
 * @description Centralised logger prefixing output with [EventPulse].
 * Automatically silent when NODE_ENV === "test" to preserve clean test runs.
 */

export const logger = {
  warn: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[EventPulse]", ...args);
    }
  },
  error: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[EventPulse]", ...args);
    }
  },
};
