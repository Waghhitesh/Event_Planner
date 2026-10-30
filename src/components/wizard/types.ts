import type { ReactNode } from "react";
import type { ClientIntake, EventType, Currency } from "@/lib/schemas";

export type FieldErrors = Partial<Record<keyof ClientIntake | "form", string>>;

export interface WizardStep {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface StepProps {
  formId: string;
  errors: FieldErrors;
  eventType: EventType | "";
  setEventType: (v: EventType) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  currency: Currency;
  setCurrency: (v: Currency) => void;
  totalBudget: string;
  setTotalBudget: (v: string) => void;
  guestCount: string;
  setGuestCount: (v: string) => void;
  themePreferences: string;
  setThemePreferences: (v: string) => void;
  specialRequirements: string;
  setSpecialRequirements: (v: string) => void;
  clearError: (field: keyof FieldErrors) => void;
  registerRef: (field: string, el: HTMLElement | null) => void;
}
