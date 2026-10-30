/**
 * @file app/not-found.tsx
 * @description 404 page for EventPulse AI.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <p className="text-6xl mb-4" aria-hidden="true">🔍</p>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        Back to EventPulse AI
      </Link>
    </main>
  );
}
