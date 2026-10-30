/**
 * @file app/page.tsx
 * @description EventPulse AI — Root page.
 *
 * This file is a React Server Component (no "use client" directive).
 * The header, hero copy, and footer are rendered server-side.
 * All interactive state lives inside <PlannerApp> which is a Client Component.
 */

import { Sparkles } from "lucide-react";
import { MODEL_DISPLAY_NAME } from "@/lib/config";
import PlannerApp from "@/components/PlannerApp";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Site header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-500" aria-hidden="true" />
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            EventPulse <span className="text-violet-500">AI</span>
          </span>
          <span className="ml-2 text-xs bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">
            Powered by {MODEL_DISPLAY_NAME}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10">
        <PlannerApp />
      </main>

      {/* Site footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-600 dark:text-gray-400">
        EventPulse AI &nbsp;·&nbsp; Powered by {MODEL_DISPLAY_NAME} &nbsp;·&nbsp; Free &amp; Open
        Source
      </footer>
    </div>
  );
}
