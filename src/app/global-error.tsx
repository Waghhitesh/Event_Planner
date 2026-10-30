"use client";

/**
 * @file app/global-error.tsx
 * @description Global error boundary (wraps the root layout).
 */

import { AlertTriangle } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-white">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Critical error</h1>
        <p className="text-gray-600 mb-6">The application encountered a critical error.</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
