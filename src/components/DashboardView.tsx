"use client";

/**
 * @file DashboardView.tsx
 * @description Responsive, accessible event plan dashboard for EventPulse AI.
 *
 * Key improvements over v1:
 *  - All tab panels are mounted with hidden, not conditionally rendered.
 *    This preserves TimelineTab checkbox state and VendorsTab expand state
 *    across tab switches without needing to lift state.
 *  - Event name rendered as <h1> (the page's only h1 when dashboard is visible).
 *  - Uses refs-based focus for tab keyboard navigation (avoids document.getElementById).
 *  - Budget, Timeline, Vendors, Ideas split into src/components/dashboard/*.
 *  - Print stylesheet supported via globals.css @media print rules.
 */

import { useState, useRef, useEffect, type RefObject } from "react";
import { RefreshCw } from "lucide-react";
import type { GeminiResponse, Currency } from "@/lib/schemas";
import { formatDateDisplay } from "@/lib/date";
import BudgetTab from "@/components/dashboard/BudgetTab";
import TimelineTab from "@/components/dashboard/TimelineTab";
import VendorsTab from "@/components/dashboard/VendorsTab";
import IdeasTab from "@/components/dashboard/IdeasTab";
import GoogleActions from "@/components/dashboard/GoogleActions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardViewProps {
  plan: GeminiResponse;
  eventDate: string;
  location: string;
  currency?: Currency;
  onReset: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}

type TabId = "budget" | "timeline" | "vendors" | "ideas";

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: Tab[] = [
  { id: "budget", label: "Budget", emoji: "💰" },
  { id: "timeline", label: "Timeline", emoji: "📅" },
  { id: "vendors", label: "Vendors", emoji: "🏪" },
  { id: "ideas", label: "Ideas", emoji: "💡" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays the AI-generated event plan in a tabbed dashboard layout.
 */
export default function DashboardView({
  plan,
  eventDate,
  location,
  currency = "INR",
  onReset,
  headingRef,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("budget");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const resolvedHeadingRef =
    (headingRef as RefObject<HTMLHeadingElement | null>) ?? internalHeadingRef;

  useEffect(() => {
    resolvedHeadingRef.current?.focus();
  }, [resolvedHeadingRef]);

  // ── Keyboard navigation (roving tabindex) ──────────────────────────────

  function handleTabKeyDown(e: React.KeyboardEvent, idx: number) {
    let target = -1;
    if (e.key === "ArrowRight") target = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") target = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = TABS.length - 1;

    if (target !== -1) {
      e.preventDefault();
      const tab = TABS[target];
      if (tab) {
        setActiveTab(tab.id);
        tabRefs.current[target]?.focus();
      }
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 print:space-y-4">
      {/* Event header — h1 is the event name */}
      <header className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-lg print:shadow-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1">Your AI-Generated Plan</p>
            <h1
              ref={resolvedHeadingRef as RefObject<HTMLHeadingElement>}
              tabIndex={-1}
              className="text-2xl font-bold outline-none"
            >
              {plan.eventName}
            </h1>
            <p className="text-violet-100 text-sm mt-1">
              📍 {location} &nbsp;·&nbsp; 📅 {formatDateDisplay(eventDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Start over with a new event plan"
            data-print-hidden
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Start Over
          </button>
        </div>
      </header>

      {/* Google integration bar */}
      <div data-print-hidden>
        <GoogleActions plan={plan} eventDate={eventDate} location={location} currency={currency} />
      </div>

      {/* Tabbed dashboard */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Tab list */}
        <div
          role="tablist"
          aria-label="Event plan sections"
          className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          data-print-hidden
        >
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 ${
                  isActive
                    ? "border-b-2 border-violet-500 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span aria-hidden="true">{tab.emoji}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab panels — all mounted, visibility via hidden attribute */}
        <div className="p-5 sm:p-6">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              id={`tabpanel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              hidden={activeTab !== tab.id}
            >
              {tab.id === "budget" && <BudgetTab plan={plan} currency={currency} />}
              {tab.id === "timeline" && <TimelineTab plan={plan} />}
              {tab.id === "vendors" && <VendorsTab plan={plan} currency={currency} />}
              {tab.id === "ideas" && <IdeasTab plan={plan} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
