/**
 * @file src/components/wizard/useWizardForm.ts
 * @description Custom hook managing wizard form state, updates, and validation errors.
 */

import { useState, useCallback } from "react";
import type { ClientIntake } from "@/lib/schemas";
import type { FieldErrors } from "./types";

export type WizardFormValues = Partial<ClientIntake>;

const INITIAL_VALUES: WizardFormValues = {
  currency: "INR",
  location: "",
  themePreferences: "",
  specialRequirements: "",
};

export function useWizardForm(initial: WizardFormValues = INITIAL_VALUES) {
  const [values, setValues] = useState<WizardFormValues>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = useCallback(
    <K extends keyof ClientIntake>(field: K, value: ClientIntake[K] | undefined) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const clearError = useCallback((field: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetErrors = useCallback(() => setErrors({}), []);

  return {
    values,
    errors,
    setErrors,
    update,
    clearError,
    resetErrors,
  };
}
