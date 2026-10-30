"use client";

/**
 * @file components/dashboard/VendorsTab.tsx
 * @description Vendor checklist tab with collapsible vetting questions.
 * Expanded state persists across tab switches (component stays mounted).
 */

import { memo, useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GeminiResponse, Currency } from "@/lib/schemas";
import { formatCurrency } from "@/lib/format";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type VendorStatus = "not_started" | "researching" | "contacted" | "booked";

const STATUS_LABELS: Record<VendorStatus, string> = {
  not_started: "Not Started",
  researching: "Researching",
  contacted: "Contacted",
  booked: "Booked ✓",
};

const STATUS_COLORS: Record<VendorStatus, string> = {
  not_started: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  researching: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  booked: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VendorsTabProps {
  plan: GeminiResponse;
  currency?: Currency;
}

/**
 * Renders the vendor checklist with collapsible vetting interview questions.
 */
const VendorsTab = memo(function VendorsTab({ plan, currency = "INR" }: VendorsTabProps) {
  const headingId = useId();
  const panelId = useId();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(service: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  }

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="sr-only">
        Vendor Checklist
      </h3>
      <ul className="space-y-3" aria-label="Vendor checklist">
        {plan.vendorChecklist.map((vendor) => {
          const isOpen = expanded.has(vendor.service);
          const detailsId = `${panelId}-details-${vendor.service.replace(/\s+/g, "-").toLowerCase()}`;
          const status = vendor.status as VendorStatus;
          return (
            <li
              key={vendor.service}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {vendor.service}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? ""}`}
                    >
                      {STATUS_LABELS[status] ?? vendor.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Est. {formatCurrency(vendor.estimatedCost, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(vendor.service)}
                  aria-expanded={isOpen}
                  aria-controls={detailsId}
                  aria-label={
                    isOpen
                      ? `Collapse vetting questions for ${vendor.service}`
                      : `Expand vetting questions for ${vendor.service}`
                  }
                  className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Collapsible vetting questions */}
              <div
                id={detailsId}
                hidden={!isOpen}
                className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3"
              >
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Interview Questions
                </p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {vendor.vettingQuestions.map((q, qi) => (
                    <li key={qi} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

export default VendorsTab;
