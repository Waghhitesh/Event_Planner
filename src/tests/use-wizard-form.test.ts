// @vitest-environment jsdom
/**
 * @file src/tests/use-wizard-form.test.ts
 * @description Unit tests for useWizardForm hook.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWizardForm } from "../components/wizard/useWizardForm";

describe("useWizardForm hook", () => {
  it("initializes with default values and empty errors", () => {
    const { result } = renderHook(() => useWizardForm());
    expect(result.current.values.currency).toBe("INR");
    expect(result.current.values.eventType).toBeUndefined();
    expect(result.current.errors).toEqual({});
  });

  it("updates values and automatically clears error for updated field", () => {
    const { result } = renderHook(() => useWizardForm());

    act(() => {
      result.current.setErrors({ eventType: "Please select an event type" });
    });
    expect(result.current.errors.eventType).toBe("Please select an event type");

    act(() => {
      result.current.update("eventType", "wedding");
    });
    expect(result.current.values.eventType).toBe("wedding");
    expect(result.current.errors.eventType).toBeUndefined();
  });

  it("clears specific error manually and resets all errors", () => {
    const { result } = renderHook(() => useWizardForm());

    act(() => {
      result.current.setErrors({ location: "Location required", totalBudget: "Budget required" });
    });

    act(() => {
      result.current.clearError("location");
    });
    expect(result.current.errors.location).toBeUndefined();
    expect(result.current.errors.totalBudget).toBe("Budget required");

    act(() => {
      result.current.resetErrors();
    });
    expect(result.current.errors).toEqual({});
  });
});
