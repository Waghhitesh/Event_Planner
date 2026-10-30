"use client";

/**
 * @file EventWizard.tsx
 * @description Multi-step accessible event intake form for EventPulse AI.
 * WCAG 2.1 AA compliant: full keyboard navigation, ARIA live regions,
 * focus management, and visible focus indicators.
 *
 * Architecture:
 *  - One component per step (Step0EventType, Step1Details, Step2Budget, Step3Preferences)
 *  - Shared primitives in ./wizard/primitives
 *  - Step validation uses ClientIntakeSchema.pick().safeParse — no duplicated rules
 */

import { useState, useEffect, useRef, useId, useCallback } from "react";
import type { ClientIntake, EventType, Currency, GeminiResponse } from "@/lib/schemas";
import { AlertTriangle } from "lucide-react";
import { STEPS, FIELD_ID_MAP, STEP_SCHEMAS } from "./wizard/constants";
import { WizardProgress } from "./wizard/WizardProgress";
import { WizardNav } from "./wizard/WizardNav";
import { Step0EventType } from "./wizard/Step0EventType";
import { Step1Details } from "./wizard/Step1Details";
import { Step2Budget } from "./wizard/Step2Budget";
import { Step3Preferences } from "./wizard/Step3Preferences";
import type { FieldErrors, StepProps } from "./wizard/types";

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

  // Form state
  const [eventType, setEventType] = useState<EventType | "">("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [totalBudget, setTotalBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [themePreferences, setThemePreferences] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateStep(step: number): boolean {
    const schema = STEP_SCHEMAS[step];
    if (!schema) return true;

    const stepData: Record<string, unknown> = {};
    if (step === 0) stepData.eventType = eventType || undefined;
    if (step === 1) {
      stepData.eventDate = eventDate || undefined;
      stepData.location = location;
    }
    if (step === 2) {
      stepData.totalBudget = totalBudget ? parseFloat(totalBudget) : undefined;
      stepData.guestCount = guestCount ? parseInt(guestCount, 10) : undefined;
      stepData.currency = currency;
    }
    if (step === 3) stepData.themePreferences = themePreferences;

    const result = schema.safeParse(stepData);
    if (result.success) {
      setErrors({});
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
      setErrors({});
    }
  }

  async function handleSubmit() {
    setIsLoading(true);
    setApiError(null);

    const intake: ClientIntake = {
      eventType: eventType as EventType,
      eventDate,
      location,
      currency,
      totalBudget: parseFloat(totalBudget),
      guestCount: parseInt(guestCount, 10),
      themePreferences,
      specialRequirements,
    };

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
      });

      const json: unknown = await res.json();
      if (!res.ok) {
        const errorObj = json as { error?: string };
        throw new Error(errorObj.error ?? "An unexpected error occurred");
      }

      onPlanGenerated(json as GeminiResponse, intake);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate plan";
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const stepProps: StepProps = {
    formId, errors, eventType, setEventType, eventDate, setEventDate,
    location, setLocation, currency, setCurrency, totalBudget, setTotalBudget,
    guestCount, setGuestCount, themePreferences, setThemePreferences,
    specialRequirements, setSpecialRequirements, clearError, registerRef,
  };

  return (
    <section aria-label="Event planning wizard" className="w-full max-w-2xl mx-auto">
      <WizardProgress steps={STEPS} currentStep={currentStep} />

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 sm:p-8">
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
          {currentStep === 0 && <Step0EventType {...stepProps} />}
          {currentStep === 1 && <Step1Details {...stepProps} />}
          {currentStep === 2 && <Step2Budget {...stepProps} />}
          {currentStep === 3 && <Step3Preferences {...stepProps} />}
        </div>

        <WizardNav
          currentStep={currentStep}
          totalSteps={STEPS.length}
          isLoading={isLoading}
          onBack={handleBack}
          onNext={handleNext}
        />
      </div>
    </section>
  );
}
