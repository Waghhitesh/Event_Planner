"use client";

/**
 * @file EventWizard.tsx
 * @description Multi-step accessible event intake form for EventPulse AI.
 * WCAG 2.1 AA compliant: full keyboard navigation, ARIA live regions,
 * focus management, and visible focus indicators.
 *
 * Architecture:
 *  - One component per step (Step0EventType, Step1Details, Step2Budget, Step3Preferences)
 *  - Shared FormField, TextInput, TextArea, FieldError primitives
 *  - Step validation uses ClientIntakeSchema.pick().safeParse — no duplicated rules
 *  - EventType imported from schemas — no local duplicate
 */

import {
  useState,
  useEffect,
  useRef,
  useId,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  ClientIntakeSchema,
  type ClientIntake,
  type EventType,
  type GeminiResponse,
} from "@/lib/schemas";
import { tomorrowDateString } from "@/lib/date";
import { LIMITS } from "@/lib/config";
import {
  CalendarDays,
  MapPin,
  Users,
  Wallet,
  Sparkles,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<keyof ClientIntake | "form", string>>;

interface EventWizardProps {
  onPlanGenerated: (plan: GeminiResponse, intake: ClientIntake) => void;
}

interface WizardStep {
  id: string;
  label: string;
  icon: ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: WizardStep[] = [
  {
    id: "event-type",
    label: "Event Type",
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "details",
    label: "Event Details",
    icon: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "budget",
    label: "Budget & Guests",
    icon: <Wallet className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: <ClipboardList className="h-4 w-4" aria-hidden="true" />,
  },
];

const EVENT_TYPES: {
  value: EventType;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: "wedding",
    label: "Wedding",
    description: "Celebrate love with an unforgettable ceremony and reception",
    emoji: "💍",
  },
  {
    value: "birthday",
    label: "Birthday",
    description: "Create magical birthday memories for someone special",
    emoji: "🎂",
  },
  {
    value: "community",
    label: "Community Event",
    description: "Bring people together for meaningful shared experiences",
    emoji: "🏘️",
  },
];

// ---------------------------------------------------------------------------
// Primitive components
// ---------------------------------------------------------------------------

interface FieldErrorProps {
  id: string;
  message: string | undefined;
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {message}
    </p>
  );
}

const INPUT_BASE =
  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100";
const INPUT_ERROR = "border-red-400 dark:border-red-500";
const INPUT_OK = "border-gray-300 dark:border-gray-600";

interface TextInputProps {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  maxLength?: number;
  error?: string;
  errorId: string;
  hintId?: string;
  required?: boolean;
}

function TextInput({
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  maxLength,
  error,
  errorId,
  hintId,
  required = true,
}: TextInputProps) {
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ");
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      maxLength={maxLength}
      aria-required={required}
      aria-describedby={describedBy || undefined}
      aria-invalid={!!error}
      className={`${INPUT_BASE} ${error ? INPUT_ERROR : INPUT_OK}`}
    />
  );
}

interface TextAreaProps {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  errorId: string;
  hintId?: string;
  required?: boolean;
}

function TextArea({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  maxLength,
  error,
  errorId,
  hintId,
  required = true,
}: TextAreaProps) {
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ");
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-required={required}
      aria-describedby={describedBy || undefined}
      aria-invalid={!!error}
      className={`${INPUT_BASE} resize-none ${error ? INPUT_ERROR : INPUT_OK}`}
    />
  );
}

interface FormFieldProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

function FormField({ label, children, className = "" }: FormFieldProps) {
  return (
    <div className={className}>
      {label}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

interface StepProps {
  formId: string;
  errors: FieldErrors;
  eventType: EventType | "";
  setEventType: (v: EventType) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  totalBudget: string;
  setTotalBudget: (v: string) => void;
  guestCount: string;
  setGuestCount: (v: string) => void;
  themePreferences: string;
  setThemePreferences: (v: string) => void;
  specialRequirements: string;
  setSpecialRequirements: (v: string) => void;
  clearError: (field: keyof FieldErrors) => void;
  minDateStr: string;
}

function Step0EventType({ formId, errors, eventType, setEventType, clearError }: StepProps) {
  const errorId = `${formId}-eventType-error`;
  return (
    <fieldset className="border-0 p-0 m-0" aria-describedby={errors.eventType ? errorId : undefined}>
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
                  clearError("eventType");
                }}
                className="sr-only"
                aria-describedby={`${inputId}-desc`}
              />
              <span className="text-4xl" aria-hidden="true">
                {type.emoji}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{type.label}</span>
              <span
                id={`${inputId}-desc`}
                className="text-xs text-center text-gray-600 dark:text-gray-400"
              >
                {type.description}
              </span>
              {isSelected && (
                <span
                  className="absolute top-2 right-2 h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                    <path
                      d="M10 3L5 8.5 2 5.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
              )}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={errors.eventType} />
    </fieldset>
  );
}

function Step1Details({
  formId,
  errors,
  eventDate,
  setEventDate,
  location,
  setLocation,
  clearError,
  minDateStr,
}: StepProps) {
  return (
    <div className="space-y-5">
      <FormField
        label={
          <label
            htmlFor={`${formId}-date`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <CalendarDays className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
            Event Date <span aria-hidden="true" className="text-red-500">*</span>
          </label>
        }
      >
        <TextInput
          id={`${formId}-date`}
          type="date"
          value={eventDate}
          onChange={(e) => {
            setEventDate(e.target.value);
            clearError("eventDate");
          }}
          min={minDateStr}
          error={errors.eventDate}
          errorId={`${formId}-date-error`}
        />
        <FieldError id={`${formId}-date-error`} message={errors.eventDate} />
      </FormField>

      <FormField
        label={
          <label
            htmlFor={`${formId}-location`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <MapPin className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
            Event Location <span aria-hidden="true" className="text-red-500">*</span>
          </label>
        }
      >
        <TextInput
          id={`${formId}-location`}
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            clearError("location");
          }}
          placeholder="e.g. Grand Ballroom, Mumbai"
          maxLength={LIMITS.LOCATION_MAX}
          error={errors.location}
          errorId={`${formId}-location-error`}
        />
        <FieldError id={`${formId}-location-error`} message={errors.location} />
      </FormField>
    </div>
  );
}

function Step2Budget({
  formId,
  errors,
  totalBudget,
  setTotalBudget,
  guestCount,
  setGuestCount,
  clearError,
}: StepProps) {
  return (
    <div className="space-y-5">
      <FormField
        label={
          <label
            htmlFor={`${formId}-budget`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Wallet className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
            Total Budget (₹ / $) <span aria-hidden="true" className="text-red-500">*</span>
          </label>
        }
      >
        <TextInput
          id={`${formId}-budget`}
          type="number"
          value={totalBudget}
          onChange={(e) => {
            setTotalBudget(e.target.value);
            clearError("totalBudget");
          }}
          placeholder="e.g. 500000"
          min={1}
          max={LIMITS.MAX_BUDGET}
          error={errors.totalBudget}
          errorId={`${formId}-budget-error`}
          hintId={`${formId}-budget-hint`}
        />
        <p id={`${formId}-budget-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Enter your total event budget. AI will break it down across categories.
        </p>
        <FieldError id={`${formId}-budget-error`} message={errors.totalBudget} />
      </FormField>

      <FormField
        label={
          <label
            htmlFor={`${formId}-guests`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Users className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
            Guest Count <span aria-hidden="true" className="text-red-500">*</span>
          </label>
        }
      >
        <TextInput
          id={`${formId}-guests`}
          type="number"
          value={guestCount}
          onChange={(e) => {
            setGuestCount(e.target.value);
            clearError("guestCount");
          }}
          placeholder="e.g. 150"
          min={1}
          max={LIMITS.MAX_GUESTS}
          error={errors.guestCount}
          errorId={`${formId}-guests-error`}
        />
        <FieldError id={`${formId}-guests-error`} message={errors.guestCount} />
      </FormField>
    </div>
  );
}

function Step3Preferences({
  formId,
  errors,
  themePreferences,
  setThemePreferences,
  specialRequirements,
  setSpecialRequirements,
  clearError,
}: StepProps) {
  return (
    <div className="space-y-5">
      <FormField
        label={
          <label
            htmlFor={`${formId}-theme`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Theme Preferences <span aria-hidden="true" className="text-red-500">*</span>
          </label>
        }
      >
        <TextArea
          id={`${formId}-theme`}
          value={themePreferences}
          onChange={(e) => {
            setThemePreferences(e.target.value);
            clearError("themePreferences");
          }}
          placeholder="e.g. Rustic bohemian with fairy lights, blush and gold colour palette, outdoor garden setting"
          maxLength={LIMITS.THEME_FIELD_MAX}
          error={errors.themePreferences}
          errorId={`${formId}-theme-error`}
          hintId={`${formId}-theme-hint`}
        />
        <p id={`${formId}-theme-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {themePreferences.length}/{LIMITS.THEME_FIELD_MAX} characters
        </p>
        <FieldError id={`${formId}-theme-error`} message={errors.themePreferences} />
      </FormField>

      <FormField
        label={
          <label
            htmlFor={`${formId}-special`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Special Requirements{" "}
            <span className="font-normal text-gray-600 dark:text-gray-400">(optional)</span>
          </label>
        }
      >
        <TextArea
          id={`${formId}-special`}
          value={specialRequirements}
          onChange={(e) => setSpecialRequirements(e.target.value)}
          placeholder="e.g. Dietary restrictions, accessibility needs, specific vendors to avoid, cultural customs"
          maxLength={LIMITS.SPECIAL_REQS_MAX}
          error={undefined}
          errorId={`${formId}-special-error`}
          hintId={`${formId}-special-hint`}
          required={false}
        />
        <p id={`${formId}-special-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {specialRequirements.length}/{LIMITS.SPECIAL_REQS_MAX} characters
        </p>
      </FormField>
    </div>
  );
}

// Validation schemas per step (reuse ClientIntakeSchema.pick)
const STEP_SCHEMAS = [
  ClientIntakeSchema.pick({ eventType: true }),
  ClientIntakeSchema.pick({ eventDate: true, location: true }),
  ClientIntakeSchema.pick({ totalBudget: true, guestCount: true }),
  ClientIntakeSchema.pick({ themePreferences: true }),
];

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export default function EventWizard({ onPlanGenerated }: EventWizardProps) {
  const formId = useId();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const firstErrorRef = useRef<HTMLElement | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [minDateStr, setMinDateStr] = useState("");

  // Form state
  const [eventType, setEventType] = useState<EventType | "">("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [themePreferences, setThemePreferences] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});

  // Compute tomorrow's date string on mount (avoids SSR mismatch)
  useEffect(() => {
    const s = tomorrowDateString();
    const timer = setTimeout(() => setMinDateStr(s), 0);
    return () => clearTimeout(timer);
  }, []);

  // Move focus to step heading whenever the step changes (skip first render)
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

  // ── Step validation (uses Zod schema slices) ─────────────────────────────

  function validateStep(step: number): boolean {
    const schema = STEP_SCHEMAS[step];
    if (!schema) return true;

    // Build partial data for the current step
    const stepData: Record<string, unknown> = {};
    if (step === 0) stepData.eventType = eventType || undefined;
    if (step === 1) {
      stepData.eventDate = eventDate || undefined;
      stepData.location = location;
    }
    if (step === 2) {
      stepData.totalBudget = totalBudget ? parseFloat(totalBudget) : undefined;
      stepData.guestCount = guestCount ? parseInt(guestCount, 10) : undefined;
    }
    if (step === 3) stepData.themePreferences = themePreferences;

    const result = schema.safeParse(stepData);
    if (result.success) {
      setErrors({});
      return true;
    }

    // Map Zod field errors into our errors state
    const newErrors: FieldErrors = {};
    const flat = result.error.flatten().fieldErrors;
    for (const [field, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length > 0) {
        newErrors[field as keyof FieldErrors] = msgs[0];
      }
    }
    setErrors(newErrors);

    // Focus the first invalid field
    const firstField = Object.keys(newErrors)[0];
    if (firstField) {
      const el = document.getElementById(
        firstField === "eventType"
          ? `${formId}-event-type-wedding`
          : `${formId}-${firstField === "totalBudget" ? "budget" : firstField === "guestCount" ? "guests" : firstField}`
      );
      if (el) {
        firstErrorRef.current = el as HTMLElement;
        (el as HTMLElement).focus();
      }
    }

    return false;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

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

  // ── Submission ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setIsLoading(true);
    setApiError(null);

    const intake: ClientIntake = {
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

  // ── Shared step props ─────────────────────────────────────────────────────

  const stepProps: StepProps = {
    formId,
    errors,
    eventType,
    setEventType,
    eventDate,
    setEventDate,
    location,
    setLocation,
    totalBudget,
    setTotalBudget,
    guestCount,
    setGuestCount,
    themePreferences,
    setThemePreferences,
    specialRequirements,
    setSpecialRequirements,
    clearError,
    minDateStr,
  };

  const progressPercent = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <section aria-label="Event planning wizard" className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between mb-2" aria-hidden="true">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                idx <= currentStep
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-500 dark:text-gray-500"
              }`}
            >
              <span aria-hidden="true">{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          ))}
        </div>
        {/* Role=progressbar on the outer track element */}
        <div
          className="h-2 rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Step ${currentStep + 1} of ${STEPS.length}: ${progressPercent}% complete`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step card */}
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

        {/* API error region */}
        {apiError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Loading status region (separate from button so screen readers don't double-announce) */}
        {isLoading && (
          <div role="status" aria-live="polite" className="sr-only">
            Generating your event plan, please wait…
          </div>
        )}

        {/* Step content */}
        <div aria-labelledby={`${formId}-step-heading`}>
          {currentStep === 0 && <Step0EventType {...stepProps} />}
          {currentStep === 1 && <Step1Details {...stepProps} />}
          {currentStep === 2 && <Step2Budget {...stepProps} />}
          {currentStep === 3 && <Step3Preferences {...stepProps} />}
        </div>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:from-violet-700 hover:to-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Generating Plan…</span>
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
