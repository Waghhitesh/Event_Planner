"use client";

/**
 * @file app/page.tsx
 * @description EventPulse AI — Root page component.
 * Orchestrates the EventWizard → DashboardView flow.
 */

import React, { useState } from "react";
import EventWizard from "@/components/EventWizard";
import DashboardView from "@/components/DashboardView";
import type { GeminiResponse } from "@/lib/schemas";
import { Sparkles } from "lucide-react";

interface PlanState {
  plan: GeminiResponse;
  eventDate: string;
  location: string;
}

export default function Home() {
  const [planState, setPlanState] = useState<PlanState | null>(null);

  function handlePlanGenerated(plan: GeminiResponse, eventDate: string, location: string) {
    setPlanState({ plan, eventDate, location });
    // Smooth scroll to top on plan reveal
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setPlanState(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Skip link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-500" aria-hidden="true" />
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            EventPulse <span className="text-violet-500">AI</span>
          </span>
          <span className="ml-2 text-xs bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">
            Powered by Gemini 1.5 Flash
          </span>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10">
        {planState ? (
          <DashboardView
            plan={planState.plan}
            eventDate={planState.eventDate}
            location={planState.location}
            onReset={handleReset}
          />
        ) : (
          <div className="space-y-8">
            {/* Hero */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                Plan Your Perfect Event{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-500">
                  with AI
                </span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                Weddings, birthdays, and community gatherings — get a complete plan with budget breakdowns, timelines, vendor checklists, and personalised ideas in seconds.
              </p>
            </div>

            {/* Wizard */}
            <WizardWrapper onPlanGenerated={handlePlanGenerated} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        EventPulse AI &nbsp;·&nbsp; Powered by Google Gemini 1.5 Flash &nbsp;·&nbsp; Free &amp; Open Source
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper to capture event date & location from wizard state before calling
// onPlanGenerated (the wizard only calls back with the Gemini plan, but we
// need extra fields for Google integrations).
// ---------------------------------------------------------------------------

function WizardWrapper({
  onPlanGenerated,
}: {
  onPlanGenerated: (plan: GeminiResponse, eventDate: string, location: string) => void;
}) {
  // We intercept the form submission in the page so we can capture event
  // date/location for Google Calendar.  The wizard stores them internally;
  // since they are also in the API response we derive them from the intake
  // payload stored temporarily here via a form-level ref pattern.
  const [capturedDate, setCapturedDate] = useState("");
  const [capturedLocation, setCapturedLocation] = useState("");

  return (
    <EventWizard
      onDateChange={setCapturedDate}
      onLocationChange={setCapturedLocation}
      onPlanGenerated={(plan) => onPlanGenerated(plan, capturedDate, capturedLocation)}
    />
  );
}
