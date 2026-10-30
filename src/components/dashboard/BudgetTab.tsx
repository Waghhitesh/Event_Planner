"use client";

/**
 * @file components/dashboard/BudgetTab.tsx
 * @description Budget breakdown tab for the EventPulse AI dashboard.
 */

import { memo, useId } from "react";
import type { GeminiResponse, Currency } from "@/lib/schemas";
import { formatCurrency } from "@/lib/format";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Priority = "critical" | "high" | "medium" | "low";

const PRIORITY_BADGE: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const PRIORITY_BAR: Record<Priority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BudgetTabProps {
  plan: GeminiResponse;
  currency?: Currency;
}

/**
 * Renders the budget breakdown section with progress bars and cost-saving tips.
 */
const BudgetTab = memo(function BudgetTab({ plan, currency = "INR" }: BudgetTabProps) {
  const total = plan.totalEstimatedCost;
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        Budget Breakdown
      </h2>

      {/* Summary card */}
      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border border-violet-100 dark:border-violet-800 p-5 mb-6">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Total Estimated Cost</p>
        <p className="text-3xl font-bold text-violet-700 dark:text-violet-300 mt-1">
          {formatCurrency(total, currency)}
        </p>
        <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">{plan.themeSummary}</p>
      </div>

      {/* Category list */}
      <ul className="space-y-4" aria-label="Budget categories">
        {plan.budgetBreakdown.map((item) => {
          const pct = total > 0 ? Math.min((item.allocatedAmount / total) * 100, 100) : 0;
          const priority = item.priority as Priority;
          const barId = `budget-bar-${item.category.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <li
              key={item.category}
              className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {item.category}
                  </span>
                  <span
                    className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[priority] ?? ""}`}
                  >
                    {item.priority}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {formatCurrency(item.allocatedAmount, currency)}
                </span>
              </div>

              {/* Progress bar — aria-* on the role="progressbar" element */}
              <div
                id={barId}
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.category}: ${Math.round(pct)}% of total budget`}
                className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-2"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${PRIORITY_BAR[priority] ?? "bg-violet-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-green-700 dark:text-green-400">💡 Tip:</span>{" "}
                {item.costSavingTip}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

export default BudgetTab;
