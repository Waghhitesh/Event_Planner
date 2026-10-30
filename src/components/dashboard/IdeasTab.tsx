"use client";

/**
 * @file components/dashboard/IdeasTab.tsx
 * @description Personalised event ideas tab for EventPulse AI dashboard.
 */

import { memo, useId } from "react";
import { Lightbulb } from "lucide-react";
import type { GeminiResponse } from "@/lib/schemas";

interface IdeasTabProps {
  plan: GeminiResponse;
}

/**
 * Renders the personalised event ideas grid.
 */
const IdeasTab = memo(function IdeasTab({ plan }: IdeasTabProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="sr-only">
        Personalised Ideas
      </h3>
      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Personalised event ideas">
        {plan.personalizedIdeas.map((idea) => (
          <li
            key={idea.idea}
            className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
          >
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" aria-hidden="true" />
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{idea.idea}</h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {idea.implementationDetails}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
});

export default IdeasTab;
