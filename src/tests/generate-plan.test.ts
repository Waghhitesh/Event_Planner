/**
 * @file src/tests/generate-plan.test.ts
 * @description Unit tests for plan generation orchestration service.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePlan,
  callGemini,
  parseAndValidateResponse,
  isQuotaOrRateLimitError,
  classifyFailure,
} from "../lib/generate-plan";
import { MOCK_PLAN, VALID_INTAKE } from "./fixtures";

const mockGenerateContent = vi.fn();

vi.mock("../lib/gemini", () => ({
  getGeminiModel: () => ({
    generateContent: mockGenerateContent,
  }),
  responseSchema: {},
  generationConfig: {},
  getGenAI: vi.fn(),
}));

describe("generate-plan module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isQuotaOrRateLimitError", () => {
    it("detects status 429 objects", () => {
      expect(isQuotaOrRateLimitError({ status: 429 })).toBe(true);
      expect(isQuotaOrRateLimitError({ status: 500 })).toBe(false);
    });

    it("detects quota keywords in error message", () => {
      expect(
        isQuotaOrRateLimitError(new Error("Resource has been exhausted (e.g. check quota)"))
      ).toBe(true);
      expect(isQuotaOrRateLimitError(new Error("Too Many Requests"))).toBe(true);
      expect(isQuotaOrRateLimitError(new Error("Generic network error"))).toBe(false);
      expect(isQuotaOrRateLimitError(null)).toBe(false);
    });
  });

  describe("classifyFailure", () => {
    it("returns 'timeout' if signal is aborted", () => {
      const controller = new AbortController();
      controller.abort();
      expect(classifyFailure(new Error("Whatever"), controller.signal)).toBe("timeout");
    });

    it("returns 'quota' on quota or rate-limit errors", () => {
      expect(classifyFailure(new Error("RESOURCE_EXHAUSTED"))).toBe("quota");
      expect(classifyFailure({ status: 429 })).toBe("quota");
    });

    it("returns 'upstream' for general errors", () => {
      expect(classifyFailure(new Error("Connection reset"))).toBe("upstream");
    });
  });

  describe("parseAndValidateResponse", () => {
    it("parses valid JSON matching GeminiResponseSchema and sanitizes strings", () => {
      const plan = parseAndValidateResponse(JSON.stringify(MOCK_PLAN));
      expect(plan.eventName).toBe(MOCK_PLAN.eventName);
      expect(plan.budgetBreakdown.length).toBeGreaterThan(0);
    });

    it("throws on non-JSON input", () => {
      expect(() => parseAndValidateResponse("not-json")).toThrow("AI returned non-JSON response");
    });

    it("throws on schema mismatch", () => {
      const invalid = { eventName: "Missing fields" };
      expect(() => parseAndValidateResponse(JSON.stringify(invalid))).toThrow("Schema mismatch");
    });
  });

  describe("callGemini", () => {
    it("calls model.generateContent with prompt and signal", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "OK" },
      });
      const controller = new AbortController();
      const res = await callGemini("test prompt", controller.signal);
      expect(res).toBe("OK");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        { contents: [{ role: "user", parts: [{ text: "test prompt" }] }] },
        { signal: controller.signal }
      );
    });
  });

  describe("generatePlan orchestration", () => {
    it("returns { ok: true, plan } on first attempt success with valid invariants", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(MOCK_PLAN) },
      });

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.plan.eventName).toBe(MOCK_PLAN.eventName);
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("returns { ok: false, kind: 'quota' } immediately without retry on 429", async () => {
      mockGenerateContent.mockRejectedValue(new Error("Quota exceeded: RESOURCE_EXHAUSTED"));

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("quota");
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("returns { ok: false, kind: 'timeout' } when signal is aborted", async () => {
      const controller = new AbortController();
      mockGenerateContent.mockImplementation(async () => {
        controller.abort();
        throw new Error("This operation was aborted");
      });

      const res = await generatePlan(VALID_INTAKE, controller.signal);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("timeout");
      }
    });

    it("retries on parse failure and returns plan if attempt 2 succeeds", async () => {
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => "not-json" },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(MOCK_PLAN) },
        });

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("retries when attempt 1 plan fails invariants and returns normalized plan if attempt 2 still fails", async () => {
      // Invariant failure: totalEstimatedCost exceeds user budget and budget sum mismatches
      const invalidPlan = {
        ...MOCK_PLAN,
        totalEstimatedCost: VALID_INTAKE.totalBudget + 100_000,
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(invalidPlan) },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(invalidPlan) },
        });

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(true);
      if (res.ok) {
        // Normalised plan should have totalEstimatedCost <= user's totalBudget
        expect(res.plan.totalEstimatedCost).toBeLessThanOrEqual(VALID_INTAKE.totalBudget);
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("returns { ok: false, kind: 'upstream' } when both attempts fail", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Network failure 1"))
        .mockRejectedValueOnce(new Error("Network failure 2"));

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("upstream");
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("returns { ok: false, kind: 'timeout' } when attempt 2 is aborted", async () => {
      const controller = new AbortController();
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Transient network error"))
        .mockImplementationOnce(async () => {
          controller.abort();
          throw new Error("Aborted");
        });

      const res = await generatePlan(VALID_INTAKE, controller.signal);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("timeout");
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("returns { ok: false, kind: 'quota' } when attempt 2 hits quota/rate-limit", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Transient error"))
        .mockRejectedValueOnce(new Error("Resource has been exhausted (e.g. check quota)"));

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("quota");
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("normalizes plan when attempt 1 fails parse and attempt 2 succeeds but fails invariants", async () => {
      const invalidPlan = {
        ...MOCK_PLAN,
        totalEstimatedCost: VALID_INTAKE.totalBudget + 100_000,
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => "malformed json" },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(invalidPlan) },
        });

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.plan.totalEstimatedCost).toBeLessThanOrEqual(VALID_INTAKE.totalBudget);
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("accepts valid plan from attempt 2 when attempt 1 failed invariants", async () => {
      const invalidPlan = {
        ...MOCK_PLAN,
        totalEstimatedCost: VALID_INTAKE.totalBudget + 100_000,
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(invalidPlan) },
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(MOCK_PLAN) },
        });

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.plan.totalEstimatedCost).toBe(MOCK_PLAN.totalEstimatedCost);
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("normalizes attempt 1 plan when corrective retry for invariant failure throws", async () => {
      const invalidPlan = {
        ...MOCK_PLAN,
        totalEstimatedCost: VALID_INTAKE.totalBudget + 100_000,
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(invalidPlan) },
        })
        .mockRejectedValueOnce(new Error("Model connection reset"));

      const res = await generatePlan(VALID_INTAKE);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.plan.totalEstimatedCost).toBeLessThanOrEqual(VALID_INTAKE.totalBudget);
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });
});
