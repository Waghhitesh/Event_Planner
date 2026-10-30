import { CalendarDays, MapPin } from "lucide-react";
import { tomorrowDateString } from "@/lib/date";
import { LIMITS } from "@/lib/config";
import { FormField, TextInput, FieldError } from "./primitives";
import type { Step1Props } from "./types";

export function Step1Details({
  formId,
  eventDate,
  location,
  errors,
  onChange,
  clearError,
  registerRef,
}: Step1Props) {
  const minDateStr = tomorrowDateString();

  return (
    <div className="space-y-5">
      <FormField
        label={
          <label
            htmlFor={`${formId}-date`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <CalendarDays className="inline h-4 w-4 mr-1 text-violet-500" aria-hidden="true" />
            Event Date{" "}
            <span aria-hidden="true" className="text-red-500">
              *
            </span>
          </label>
        }
      >
        <TextInput
          inputRef={(el) => registerRef("eventDate", el)}
          id={`${formId}-date`}
          type="date"
          value={eventDate ?? ""}
          onChange={(e) => {
            onChange("eventDate", e.target.value);
            clearError("eventDate");
          }}
          min={minDateStr}
          suppressHydrationWarning
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
            Event Location{" "}
            <span aria-hidden="true" className="text-red-500">
              *
            </span>
          </label>
        }
      >
        <TextInput
          inputRef={(el) => registerRef("location", el)}
          id={`${formId}-location`}
          value={location ?? ""}
          onChange={(e) => {
            onChange("location", e.target.value);
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
