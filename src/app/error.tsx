"use client";

/**
 * @file app/error.tsx
 * @description Route-level error boundary for EventPulse AI.
 */

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[EventPulse] Unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </main>
  );
}
