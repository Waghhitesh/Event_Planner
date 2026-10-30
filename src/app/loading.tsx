/**
 * @file app/loading.tsx
 * @description Route-level loading skeleton for EventPulse AI.
 */

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading EventPulse AI"
      className="flex min-h-screen flex-col items-center justify-center gap-4"
    >
      <div
        className="h-10 w-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
    </div>
  );
}
