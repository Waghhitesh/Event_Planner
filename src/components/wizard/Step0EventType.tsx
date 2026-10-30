import { EVENT_TYPES } from "./constants";
import { FieldError } from "./primitives";
import type { Step0Props } from "./types";

export function Step0EventType({ formId, value, onChange, error, registerRef }: Step0Props) {
  const errorId = `${formId}-eventType-error`;
  return (
    <fieldset className="border-0 p-0 m-0" aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">Select your event type</legend>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-required="true">
        {EVENT_TYPES.map((type, idx) => {
          const inputId = `${formId}-event-type-${type.value}`;
          const isSelected = value === type.value;
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
                ref={(el) => {
                  if (idx === 0) {
                    registerRef("eventType", el);
                  }
                }}
                type="radio"
                id={inputId}
                name="eventType"
                value={type.value}
                checked={isSelected}
                onChange={() => onChange(type.value)}
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
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
