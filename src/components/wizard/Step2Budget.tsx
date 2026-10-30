import { Wallet, Users } from "lucide-react";
import { LIMITS } from "@/lib/config";
import type { Currency } from "@/lib/schemas";
import { FormField, TextInput, FieldError } from "./primitives";
import type { StepProps } from "./types";

export function Step2Budget({
  formId,
  errors,
  currency,
  setCurrency,
  totalBudget,
  setTotalBudget,
  guestCount,
  setGuestCount,
  clearError,
  registerRef,
}: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <FormField
            label={
              <label
                htmlFor={`${formId}-currency`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Currency
              </label>
            }
          >
            <select
              ref={(el) => registerRef("currency", el)}
              id={`${formId}-currency`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </FormField>
        </div>

        <div className="sm:col-span-2">
          <FormField
            label={
              <label
                htmlFor={`${formId}-budget`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                <Wallet className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
                Total Budget ({currency}) <span aria-hidden="true" className="text-red-500">*</span>
              </label>
            }
          >
            <TextInput
              inputRef={(el) => registerRef("totalBudget", el)}
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
        </div>
      </div>

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
          inputRef={(el) => registerRef("guestCount", el)}
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
