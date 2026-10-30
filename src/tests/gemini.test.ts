/**
 * @file src/tests/gemini.test.ts
 * @description Unit tests for lazy Gemini client factory.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getGenAI, getGeminiModel } from "../lib/gemini";

describe("gemini.ts lazy factory", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("returns a GoogleGenerativeAI instance", () => {
    const client = getGenAI();
    expect(client).toBeDefined();
  });

  it("returns a configured GenerativeModel instance", () => {
    const model = getGeminiModel();
    expect(model).toBeDefined();
    expect(model.model).toBeDefined();
  });
});
