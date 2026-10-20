"use client";

/**
 * @file DashboardView.tsx
 * @description Responsive, accessible dashboard displaying the AI-generated
 * event plan with budget progress bars, timeline checklist, collapsible
 * vendor vetting questions, and Google integration actions.
 */

import React, { useState, useId } from "react";
import type { GeminiResponse, BudgetBreakdownItem, TimelinePhase, VendorChecklistItem, PersonalizedIdea } from "@/lib/schemas";
import { generateGoogleCalendarUrl, generateGoogleSheetsCsv } from "@/lib/google-integrations";
import {
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Wallet,
  Clock,
  Store,
  Lightbulb,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardViewProps {
  plan: GeminiResponse;
  eventDate: string;
  location: string;
  onReset: () => void;
}

type TabId = "budget" | "timeline" | "vendors" | "ideas";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: Tab[] = [
  { id: "budget", label: "Budget", icon: <Wallet className="h-4 w-4" aria-hidden="true" /> },
  { id: "timeline", label: "Timeline", icon: <Clock className="h-4 w-4" aria-hidden="true" /> },
  { id: "vendors", label: "Vendors", icon: <Store className="h-4 w-4" aria-hidden="true" /> },
  { id: "ideas", label: "Ideas", icon: <Lightbulb className="h-4 w-4" aria-hidden="true" /> },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const PRIORITY_BAR_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BudgetTab({ plan }: { plan: GeminiResponse }) {
  const total = plan.totalEstimatedCost;
  const budgetId = useId();

  return (
    <section aria-labelledby={`${budgetId}-heading`}>
      <h3 id={`${budgetId}-heading`} className="sr-only">Budget Breakdown</h3>

      {/* Summary card */}
      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border border-violet-100 dark:border-violet-800 p-5 mb-6">
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Total Estimated Cost</p>
        <p className="text-3xl font-bold text-violet-700 dark:text-violet-300 mt-1">
          {total.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-violet-500 dark:text-violet-500 mt-1">{plan.themeSummary}</p>
      </div>

      {/* Category list */}
      <ul className="space-y-4" aria-label="Budget categories">
        {(plan.budgetBreakdown as BudgetBreakdownItem[]).map((item, i) => {
          const pct = total > 0 ? Math.min((item.allocatedAmount / total) * 100, 100) : 0;
          const barId = `budget-bar-${i}`;
          return (
            <li key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.category}</span>
                  <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {item.allocatedAmount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                </span>
              </div>
              {/* Progress bar */}
              <div
                id={barId}
                className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-2"
                role="meter"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.category}: ${Math.round(pct)}% of total budget`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${PRIORITY_BAR_COLORS[item.priority] ?? "bg-violet-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-green-700 dark:text-green-400">💡 Tip:</span>{" "}
                {item.costSavingTip}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TimelineTab({ plan }: { plan: GeminiResponse }) {
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const tlId = useId();

  function toggleTask(key: string) {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sorted = [...(plan.timeline as TimelinePhase[])].sort(
    (a, b) => b.daysBeforeEvent - a.daysBeforeEvent
  );

  return (
    <section aria-labelledby={`${tlId}-heading`}>
      <h3 id={`${tlId}-heading`} className="sr-only">Planning Timeline</h3>
      <ol className="relative space-y-0" aria-label="Event planning phases">
        {sorted.map((phase, phaseIdx) => (
          <li key={phaseIdx} className="relative pl-8 pb-6">
            {/* Vertical connector line */}
            {phaseIdx < sorted.length - 1 && (
              <span className="absolute left-3 top-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            )}
            {/* Phase dot */}
            <span
              className="absolute left-0 top-1 h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold"
              aria-hidden="true"
            >
              {phaseIdx + 1}
            </span>

            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{phase.phase}</h4>
                <span className="text-xs bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-800">
                  {phase.daysBeforeEvent === 0 ? "🎉 Event Day" : `${phase.daysBeforeEvent} days before`}
                </span>
              </div>
              <ul className="space-y-1.5" aria-label={`Tasks for ${phase.phase}`}>
                {phase.tasks.map((task, taskIdx) => {
                  const key = `${phaseIdx}-${taskIdx}`;
                  const checked = checkedTasks.has(key);
                  return (
                    <li key={taskIdx}>
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(key)}
                          className="sr-only"
                          aria-label={checked ? `Mark "${task}" as incomplete` : `Mark "${task}" as complete`}
                        />
                        <span aria-hidden="true" className="mt-0.5 flex-shrink-0 text-violet-500">
                          {checked ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-400 transition-colors" />
                          )}
                        </span>
                        <span className={`text-xs leading-relaxed ${checked ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                          {task}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function VendorsTab({ plan }: { plan: GeminiResponse }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const vendorsId = useId();

  function toggle(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const STATUS_LABELS: Record<string, string> = {
    not_started: "Not Started",
    researching: "Researching",
    contacted: "Contacted",
    booked: "Booked ✓",
  };
  const STATUS_COLORS: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    researching: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    booked: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  };

  return (
    <section aria-labelledby={`${vendorsId}-heading`}>
      <h3 id={`${vendorsId}-heading`} className="sr-only">Vendor Checklist</h3>
      <ul className="space-y-3" aria-label="Vendor checklist">
        {(plan.vendorChecklist as VendorChecklistItem[]).map((vendor, idx) => {
          const isOpen = expanded.has(idx);
          const detailsId = `${vendorsId}-details-${idx}`;
          return (
            <li
              key={idx}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{vendor.service}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[vendor.status]}`}>
                      {STATUS_LABELS[vendor.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Est.{" "}
                    {vendor.estimatedCost.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={detailsId}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
                  aria-label={isOpen ? `Collapse vetting questions for ${vendor.service}` : `Expand vetting questions for ${vendor.service}`}
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
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
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
}

function IdeasTab({ plan }: { plan: GeminiResponse }) {
  const ideasId = useId();
  return (
    <section aria-labelledby={`${ideasId}-heading`}>
      <h3 id={`${ideasId}-heading`} className="sr-only">Personalised Ideas</h3>
      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Personalised event ideas">
        {(plan.personalizedIdeas as PersonalizedIdea[]).map((idea, idx) => (
          <li
            key={idx}
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
}

// ---------------------------------------------------------------------------
// Main DashboardView component
// ---------------------------------------------------------------------------

export default function DashboardView({ plan, eventDate, location, onReset }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("budget");
  const tablistId = useId();

  // ── Google integrations ─────────────────────────────────────────────────

  const calendarUrl = generateGoogleCalendarUrl(
    plan.eventName,
    eventDate,
    `${plan.themeSummary}\n\nGenerated by EventPulse AI`,
    location
  );

  function handleExportCsv() {
    const csv = generateGoogleSheetsCsv(plan);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.eventName.replace(/\s+/g, "_")}_EventPulse_Plan.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Keyboard navigation for tab list ───────────────────────────────────

  function handleTabKeyDown(e: React.KeyboardEvent, idx: number) {
    const tabIds = TABS.map((t) => t.id);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIdx = (idx + 1) % TABS.length;
      setActiveTab(tabIds[nextIdx]);
      document.getElementById(`tab-${tabIds[nextIdx]}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIdx = (idx - 1 + TABS.length) % TABS.length;
      setActiveTab(tabIds[prevIdx]);
      document.getElementById(`tab-${tabIds[prevIdx]}`)?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(tabIds[0]);
      document.getElementById(`tab-${tabIds[0]}`)?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab(tabIds[TABS.length - 1]);
      document.getElementById(`tab-${tabIds[TABS.length - 1]}`)?.focus();
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Event header */}
      <header className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1">Your AI-Generated Plan</p>
            <h2 className="text-2xl font-bold">{plan.eventName}</h2>
            <p className="text-violet-100 text-sm mt-1">
              📍 {location} &nbsp;·&nbsp; 📅 {new Date(eventDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Start over with a new event plan"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Start Over
          </button>
        </div>
      </header>

      {/* Google Integration Bar */}
      <div
        className="flex flex-wrap gap-3"
        role="group"
        aria-label="Google integrations"
      >
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Sync this event with Google Calendar (opens in new tab)"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Sync with Google Calendar
          <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
        </a>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          aria-label="Export full event plan as CSV for Google Sheets"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export to Google Sheets (.csv)
        </button>
      </div>

      {/* Tabbed dashboard */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 shadow-sm overflow-hidden">
        {/* Tab list */}
        <div
          role="tablist"
          aria-label="Event plan sections"
          id={tablistId}
          className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
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
                    ? "border-b-2 border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        <div className="p-5 sm:p-6">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              id={`tabpanel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              hidden={activeTab !== tab.id}
            >
              {activeTab === tab.id && (
                <>
                  {tab.id === "budget" && <BudgetTab plan={plan} />}
                  {tab.id === "timeline" && <TimelineTab plan={plan} />}
                  {tab.id === "vendors" && <VendorsTab plan={plan} />}
                  {tab.id === "ideas" && <IdeasTab plan={plan} />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
