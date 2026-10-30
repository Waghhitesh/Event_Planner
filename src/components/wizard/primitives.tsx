import type { ChangeEvent, ReactNode, Ref } from "react";
import { AlertTriangle } from "lucide-react";

export interface FieldErrorProps {
  id: string;
  message: string | undefined;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {message}
    </p>
  );
}

export const INPUT_BASE =
  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-100";
export const INPUT_ERROR = "border-red-400 dark:border-red-500";
export const INPUT_OK = "border-gray-300 dark:border-gray-600";

export interface TextInputProps {
  id: string;
  value: string | number;
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
  inputRef?: Ref<HTMLInputElement>;
  suppressHydrationWarning?: boolean;
}

export function TextInput({
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
  inputRef,
  suppressHydrationWarning,
}: TextInputProps) {
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ");
  return (
    <input
      ref={inputRef}
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
      suppressHydrationWarning={suppressHydrationWarning}
      className={`${INPUT_BASE} ${error ? INPUT_ERROR : INPUT_OK}`}
    />
  );
}

export interface TextAreaProps {
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
  textareaRef?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
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
  textareaRef,
}: TextAreaProps) {
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ");
  return (
    <textarea
      ref={textareaRef}
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

export interface FormFieldProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, children, className = "" }: FormFieldProps) {
  return (
    <div className={className}>
      {label}
      {children}
    </div>
  );
}
