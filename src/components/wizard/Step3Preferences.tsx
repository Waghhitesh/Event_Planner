import { LIMITS } from "@/lib/config";
import { FormField, TextArea, FieldError } from "./primitives";
import type { Step3Props } from "./types";

export function Step3Preferences({
  formId,
  themePreferences,
  specialRequirements,
  error,
  onChange,
  clearError,
  registerRef,
}: Step3Props) {
  const theme = themePreferences ?? "";
  const special = specialRequirements ?? "";

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
          value={theme}
          onChange={(e) => {
            onChange("themePreferences", e.target.value);
            clearError("themePreferences");
          }}
          placeholder="e.g. Rustic bohemian with fairy lights, blush and gold colour palette, outdoor garden setting"
          maxLength={LIMITS.THEME_FIELD_MAX}
          error={error}
          errorId={`${formId}-theme-error`}
          hintId={`${formId}-theme-hint`}
        />
        <p id={`${formId}-theme-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {theme.length}/{LIMITS.THEME_FIELD_MAX} characters
        </p>
        <FieldError id={`${formId}-theme-error`} message={error} />
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
          value={special}
          onChange={(e) => onChange("specialRequirements", e.target.value)}
          placeholder="e.g. Dietary restrictions, accessibility needs, specific vendors to avoid, cultural customs"
          maxLength={LIMITS.SPECIAL_REQS_MAX}
          error={undefined}
          errorId={`${formId}-special-error`}
          hintId={`${formId}-special-hint`}
          required={false}
        />
        <p id={`${formId}-special-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {special.length}/{LIMITS.SPECIAL_REQS_MAX} characters
        </p>
      </FormField>
    </div>
  );
}
