import type { ReactNode } from "react";
import type { ClientIntake, EventType, Currency } from "@/lib/schemas";

export type FieldErrors = Partial<Record<keyof ClientIntake | "form", string>>;

export interface WizardStep {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface Step0Props {
  formId: string;
  value: EventType | undefined;
  onChange: (type: EventType) => void;
  error?: string;
  registerRef: (field: string, el: HTMLElement | null) => void;
}

export interface Step1Props {
  formId: string;
  eventDate?: string;
  location?: string;
  errors: FieldErrors;
  onChange: <K extends "eventDate" | "location">(field: K, value: string) => void;
  clearError: (field: keyof FieldErrors) => void;
  registerRef: (field: string, el: HTMLElement | null) => void;
}

export interface Step2Props {
  formId: string;
  currency: Currency;
  totalBudget?: number;
  guestCount?: number;
  errors: FieldErrors;
  onChange: <K extends "currency" | "totalBudget" | "guestCount">(
    field: K,
    value: ClientIntake[K] | undefined
  ) => void;
  clearError: (field: keyof FieldErrors) => void;
  registerRef: (field: string, el: HTMLElement | null) => void;
}

export interface Step3Props {
  formId: string;
  themePreferences?: string;
  specialRequirements?: string;
  error?: string;
  onChange: <K extends "themePreferences" | "specialRequirements">(field: K, value: string) => void;
  clearError: (field: keyof FieldErrors) => void;
  registerRef: (field: string, el: HTMLElement | null) => void;
}
