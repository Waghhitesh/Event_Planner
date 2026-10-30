/**
 * @file src/tests/logger.test.ts
 * @description Unit tests for logger utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is silent during test environment by default", () => {
    logger.warn("Test warning");
    logger.error("Test error");

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs with [EventPulse] prefix when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    logger.warn("Warning msg");
    logger.error("Error msg");

    expect(console.warn).toHaveBeenCalledWith("[EventPulse]", "Warning msg");
    expect(console.error).toHaveBeenCalledWith("[EventPulse]", "Error msg");
  });
});
