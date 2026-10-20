"use client";

/**
 * @file EventWizard.tsx
 * @description Multi-step accessible event intake form for EventPulse AI.
 * Implements WCAG 2.1 AA with full keyboard navigation, ARIA live regions,
 * focus management, and visible focus indicators.
 */

import React, { useState, useEffect, useRef, useId } from "react";
import type { ClientIntake } from "@/lib/schemas";
import type { GeminiResponse } from "@/lib/schemas";
import { CalendarDays, MapPin, Users, Wallet, Sparkles, ClipboardList, ChevronRight, ChevronLeft, Loader2, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventType = "wedding" | "birthday" | "community";

interface WizardStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface EventWizardProps {
  onPlanGenerated: (plan: GeminiResponse) => void;
  onDateChange?: (date: string) => void;
  onLocationChange?: (location: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: WizardStep[] = [
  { id: "event-type", label: "Event Type", icon: <Sparkles className="h-4 w-4" aria-hidden="true" /> },
  { id: "details", label: "Event Details", icon: <CalendarDays className="h-4 w-4" aria-hidden="true" /> },
  { id: "budget", label: "Budget & Guests", icon: <Wallet className="h-4 w-4" aria-hidden="true" /> },
  { id: "preferences", label: "Preferences", icon: <ClipboardList className="h-4 w-4" aria-hidden="true" /> },
];

const EVENT_TYPES: { value: EventType; label: string; description: string; emoji: string }[] = [
  { value: "wedding", label: "Wedding", description: "Celebrate love with an unforgettable ceremony and reception", emoji: "💍" },
  { value: "birthday", label: "Birthday", description: "Create magical birthday memories for someone special", emoji: "🎂" },
  { value: "community", label: "Community Event", description: "Bring people together for meaningful shared experiences", emoji: "🏘️" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventWizard({ onPlanGenerated, onDateChange, onLocationChange }: EventWizardProps) {
  const formId = useId();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Form state
  const [eventType, setEventType] = useState<EventType | "">("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [themePreferences, setThemePreferences] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");

  // Field-level errors
  const [errors, setErrors] = useState<Partial<Record<keyof ClientIntake | "form", string>>>({});

  // ── Validation helpers ──────────────────────────────────────────────────

  function validateStep(step: number): boolean {
    const newErrors: typeof errors = {};

    if (step === 0) {
      if (!eventType) newErrors.eventType = "Please select an event type";
    }
    if (step === 1) {
      if (!eventDate) {
        newErrors.eventDate = "Please select an event date";
      } else if (new Date(eventDate) <= new Date()) {
        newErrors.eventDate = "Event date must be in the future";
      }
      if (!location.trim()) newErrors.location = "Please enter the event location";
    }
    if (step === 2) {
      const budget = parseFloat(totalBudget);
      if (!totalBudget || isNaN(budget) || budget <= 0)
        newErrors.totalBudget = "Please enter a valid positive budget";
      const guests = parseInt(guestCount, 10);
      if (!guestCount || isNaN(guests) || guests < 1)
        newErrors.guestCount = "Please enter a valid guest count (minimum 1)";
    }
    if (step === 3) {
      if (!themePreferences.trim())
        newErrors.themePreferences = "Please describe your theme preferences";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  function goToStep(step: number) {
    setCurrentStep(step);
    // Move focus to heading for screen reader announcement
    setTimeout(() => stepHeadingRef.current?.focus(), 50);
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        goToStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
      setErrors({});
    }
  }

  // ── Form submission ─────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validateStep(currentStep)) return;
    setIsLoading(true);
    setApiError(null);

    const payload: ClientIntake = {
      eventType: eventType as EventType,
      eventDate,
      location,
      totalBudget: parseFloat(totalBudget),
      guestCount: parseInt(guestCount, 10),
      themePreferences,
      specialRequirements,
    };

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "An unexpected error occurred");
      }

      onPlanGenerated(json as GeminiResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate plan";
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Min date for date input (hydrated client-side to prevent SSR mismatches) ──
  const [minDateStr, setMinDateStr] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 1);
      setMinDateStr(minDate.toISOString().split("T")[0]);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderStep() {
    switch (currentStep) {
      case 0:
        return (
          <fieldset className="border-0 p-0 m-0">
            <legend className="sr-only">Select your event type</legend>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-required="true">
              {EVENT_TYPES.map((type) => {
                const inputId = `${formId}-event-type-${type.value}`;
                const isSelected = eventType === type.value;
                return (
                  <label
                    key={type.value}
                    htmlFor={inputId}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 ${
                      isSelected
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950"
                        : "border-gray-200 dark:border-gray-700 hover:border-violet-300"
                    }`}
                  >
                    <input
                      type="radio"
                      id={inputId}
                      name="eventType"
                      value={type.value}
                      checked={isSelected}
                      onChange={() => {
                        setEventType(type.value);
                        setErrors((e) => ({ ...e, eventType: undefined }));
                      }}
                      className="sr-only"
                      aria-describedby={`${inputId}-desc`}
                    />
                    <span className="text-4xl" aria-hidden="true">{type.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{type.label}</span>
                    <span id={`${inputId}-desc`} className="text-xs text-center text-gray-500 dark:text-gray-400">
                      {type.description}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center" aria-hidden="true">
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {errors.eventType && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {errors.eventType}
              </p>
            )}
          </fieldset>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label
                htmlFor={`${formId}-date`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                <CalendarDays className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
                Event Date <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-date`}
                type="date"
                value={eventDate}
                min={minDateStr}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  onDateChange?.(e.target.value);
                  setErrors((err) => ({ ...err, eventDate: undefined }));
                }}
                aria-required="true"
                aria-describedby={errors.eventDate ? `${formId}-date-error` : undefined}
                aria-invalid={!!errors.eventDate}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100 ${
                  errors.eventDate
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.eventDate && (
                <p id={`${formId}-date-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {errors.eventDate}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-location`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                <MapPin className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
                Event Location <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-location`}
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  onLocationChange?.(e.target.value);
                  setErrors((err) => ({ ...err, location: undefined }));
                }}
                placeholder="e.g. Grand Ballroom, Mumbai"
                aria-required="true"
                aria-describedby={errors.location ? `${formId}-location-error` : undefined}
                aria-invalid={!!errors.location}
                maxLength={200}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100 ${
                  errors.location
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.location && (
                <p id={`${formId}-location-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {errors.location}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label
                htmlFor={`${formId}-budget`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                <Wallet className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
                Total Budget (₹ / $) <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-budget`}
                type="number"
                value={totalBudget}
                onChange={(e) => {
                  setTotalBudget(e.target.value);
                  setErrors((err) => ({ ...err, totalBudget: undefined }));
                }}
                placeholder="e.g. 500000"
                min={1}
                max={10000000}
                aria-required="true"
                aria-describedby={`${formId}-budget-hint${errors.totalBudget ? ` ${formId}-budget-error` : ""}`}
                aria-invalid={!!errors.totalBudget}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100 ${
                  errors.totalBudget
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              <p id={`${formId}-budget-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter your total event budget. AI will break it down across categories.
              </p>
              {errors.totalBudget && (
                <p id={`${formId}-budget-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {errors.totalBudget}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-guests`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                <Users className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
                Guest Count <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-guests`}
                type="number"
                value={guestCount}
                onChange={(e) => {
                  setGuestCount(e.target.value);
                  setErrors((err) => ({ ...err, guestCount: undefined }));
                }}
                placeholder="e.g. 150"
                min={1}
                max={100000}
                aria-required="true"
                aria-describedby={errors.guestCount ? `${formId}-guests-error` : undefined}
                aria-invalid={!!errors.guestCount}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100 ${
                  errors.guestCount
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.guestCount && (
                <p id={`${formId}-guests-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {errors.guestCount}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label
                htmlFor={`${formId}-theme`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Theme Preferences <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <textarea
                id={`${formId}-theme`}
                value={themePreferences}
                onChange={(e) => {
                  setThemePreferences(e.target.value);
                  setErrors((err) => ({ ...err, themePreferences: undefined }));
                }}
                rows={3}
                placeholder="e.g. Rustic bohemian with fairy lights, blush and gold colour palette, outdoor garden setting"
                aria-required="true"
                aria-describedby={`${formId}-theme-hint${errors.themePreferences ? ` ${formId}-theme-error` : ""}`}
                aria-invalid={!!errors.themePreferences}
                maxLength={500}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100 resize-none ${
                  errors.themePreferences
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              <p id={`${formId}-theme-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {themePreferences.length}/500 characters
              </p>
              {errors.themePreferences && (
                <p id={`${formId}-theme-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {errors.themePreferences}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-special`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Special Requirements{" "}
                <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <textarea
                id={`${formId}-special`}
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                rows={3}
                placeholder="e.g. Dietary restrictions, accessibility needs, specific vendors to avoid, cultural customs"
                aria-describedby={`${formId}-special-hint`}
                maxLength={1000}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100 resize-none"
              />
              <p id={`${formId}-special-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {specialRequirements.length}/1000 characters
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Progress bar width ──────────────────────────────────────────────────
  const progressPercent = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <section
      aria-label="Event planning wizard"
      className="w-full max-w-2xl mx-auto"
    >
      {/* Progress bar */}
      <div className="mb-6" aria-label={`Step ${currentStep + 1} of ${STEPS.length}`}>
        <div className="flex justify-between mb-2">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                idx <= currentStep
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
              aria-current={idx === currentStep ? "step" : undefined}
            >
              <span aria-hidden="true">{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          ))}
        </div>
        <div
          className="h-2 rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPercent}% complete`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 sm:p-8">
        {/* Step heading — receives programmatic focus for screen readers */}
        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          id={`${formId}-step-heading`}
          className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 outline-none"
        >
          {STEPS[currentStep].label}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Step {currentStep + 1} of {STEPS.length}
        </p>

        {/* Global API error */}
        {apiError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Current step fields */}
        <div aria-labelledby={`${formId}-step-heading`}>
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Go to previous step"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:from-violet-700 hover:to-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            aria-label={
              isLoading
                ? "Generating your event plan, please wait"
                : currentStep === STEPS.length - 1
                ? "Generate your event plan"
                : "Go to next step"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span aria-live="polite">Generating Plan…</span>
              </>
            ) : currentStep === STEPS.length - 1 ? (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate Plan
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
