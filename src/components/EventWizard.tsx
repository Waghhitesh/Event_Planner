"use client";

/**
 * @file EventWizard.tsx
 * @description Multi-step accessible event intake form for EventPulse AI.
 * WCAG 2.1 AA compliant: full keyboard navigation, ARIA live regions,
 * focus management, and visible focus indicators.
 *
 * Architecture:
 *  - One component per step with explicit isolated props
 *  - useWizardForm hook manages single values object + typed updates + errors
 *  - Step validation uses ClientIntakeSchema.pick().safeParse directly
 */

import { useState, useEffect, useRef, useId, useCallback } from "react";
import type { ClientIntake, GeminiResponse } from "@/lib/schemas";
import { ClientIntakeSchema, GeminiResponseSchema } from "@/lib/schemas";
import { AlertTriangle } from "lucide-react";
import { STEPS, FIELD_ID_MAP, STEP_SCHEMAS } from "./wizard/constants";
import { WizardProgress } from "./wizard/WizardProgress";
import { WizardNav } from "./wizard/WizardNav";
import { Card } from "@/components/ui/Card";
import { Step0EventType } from "./wizard/Step0EventType";
import { Step1Details } from "./wizard/Step1Details";
import { Step2Budget } from "./wizard/Step2Budget";
import { Step3Preferences } from "./wizard/Step3Preferences";
import { useWizardForm } from "./wizard/useWizardForm";
import type { FieldErrors } from "./wizard/types";

interface EventWizardProps {
  onPlanGenerated: (plan: GeminiResponse, intake: ClientIntake) => void;
}

export default function EventWizard({ onPlanGenerated }: EventWizardProps) {
  const formId = useId();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const registerRef = useCallback((field: string, el: HTMLElement | null) => {
    fieldRefs.current[field] = el;
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { values, errors, setErrors, update, clearError, resetErrors } = useWizardForm();

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  function validateStep(step: number): boolean {
    const schema = STEP_SCHEMAS[step];
    if (!schema) return true;

    const result = schema.safeParse(values);
    if (result.success) {
      resetErrors();
      return true;
    }

    const newErrors: FieldErrors = {};
    const flat = result.error.flatten().fieldErrors;
    for (const [field, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length > 0) newErrors[field as keyof FieldErrors] = msgs[0];
    }
    setErrors(newErrors);

    const firstField = Object.keys(newErrors)[0];
    if (firstField) {
      const refEl = fieldRefs.current[firstField];
      if (refEl) {
        refEl.focus();
      } else {
        const suffix = FIELD_ID_MAP[firstField] ?? firstField;
        const fallback = document.getElementById(`${formId}-${suffix}`);
        if (fallback) {
          fallback.focus();
        }
      }
    }

    return false;
  }

  function handleNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void handleSubmit();
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      resetErrors();
    }
  }

  async function handleSubmit() {
    setIsLoading(true);
    setApiError(null);

    const parsed = ClientIntakeSchema.safeParse(values);
    if (!parsed.success) {
      setIsLoading(false);
      return;
    }
    const intake: ClientIntake = parsed.data;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
        signal: controller.signal,
      });

      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          const msg = retryAfter
            ? `Too many requests, please wait ${retryAfter} seconds`
            : "Too many requests, please wait a minute";
          throw new Error(msg);
        }
        if (res.status === 504) {
          throw new Error("The AI took too long, please try again");
        }
        if (
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
        ) {
          throw new Error((json as { error: string }).error);
        }
        throw new Error("Failed to generate plan. Please try again later.");
      }

      if (!json) {
        throw new Error("Failed to generate plan. Please try again later.");
      }

      const planParse = GeminiResponseSchema.safeParse(json);
      if (!planParse.success) {
        throw new Error("Received an unexpected plan format. Please try again.");
      }

      onPlanGenerated(planParse.data, intake);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setApiError("The AI took too long, please try again");
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to generate plan. Please try again later.";
        setApiError(message);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return (
    <section aria-label="Event planning wizard" className="w-full max-w-2xl mx-auto">
      <WizardProgress steps={STEPS} currentStep={currentStep} />

      <Card padding="lg">
        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          id={`${formId}-step-heading`}
          className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 outline-none"
        >
          {STEPS[currentStep]?.label}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Step {currentStep + 1} of {STEPS.length}
        </p>

        {apiError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        {isLoading && (
          <div role="status" aria-live="polite" className="sr-only">
            Generating your event plan, please wait…
          </div>
        )}

        <div aria-labelledby={`${formId}-step-heading`}>
          {currentStep === 0 && (
            <Step0EventType
              formId={formId}
              value={values.eventType}
              onChange={(val) => update("eventType", val)}
              error={errors.eventType}
              registerRef={registerRef}
            />
          )}
          {currentStep === 1 && (
            <Step1Details
              formId={formId}
              eventDate={values.eventDate}
              location={values.location}
              errors={errors}
              onChange={update}
              clearError={clearError}
              registerRef={registerRef}
            />
          )}
          {currentStep === 2 && (
            <Step2Budget
              formId={formId}
              currency={values.currency ?? "INR"}
              totalBudget={values.totalBudget}
              guestCount={values.guestCount}
              errors={errors}
              onChange={update}
              clearError={clearError}
              registerRef={registerRef}
            />
          )}
          {currentStep === 3 && (
            <Step3Preferences
              formId={formId}
              themePreferences={values.themePreferences}
              specialRequirements={values.specialRequirements}
              error={errors.themePreferences}
              onChange={update}
              clearError={clearError}
              registerRef={registerRef}
            />
          )}
        </div>

        <WizardNav
          currentStep={currentStep}
          totalSteps={STEPS.length}
          isLoading={isLoading}
          onBack={handleBack}
          onNext={handleNext}
        />
      </Card>
    </section>
  );
}
