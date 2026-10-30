import { LIMITS } from "@/lib/config";
import { FormField, TextArea, FieldError } from "./primitives";
import type { StepProps } from "./types";

export function Step3Preferences({
  formId,
  errors,
  themePreferences,
  setThemePreferences,
  specialRequirements,
  setSpecialRequirements,
  clearError,
  registerRef,
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
          textareaRef={(el) => registerRef("themePreferences", el)}
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
          textareaRef={(el) => registerRef("specialRequirements", el)}
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
