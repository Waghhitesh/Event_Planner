"use client";

/**
 * @file components/PlannerApp.tsx
 * @description Client-side orchestrator that manages the Wizard → Dashboard
 * state transition for EventPulse AI.
 */

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import EventWizard from "@/components/EventWizard";
import type { GeminiResponse, ClientIntake } from "@/lib/schemas";

// Lazy-load the dashboard — it's only shown after plan generation
const DashboardView = dynamic(() => import("@/components/DashboardView"), {
  ssr: false,
});

interface PlanState {
  plan: GeminiResponse;
  intake: ClientIntake;
}

/**
 * Manages the top-level wizard ↔ dashboard view state.
 * Receives the full ClientIntake from EventWizard so that eventDate and
 * location don't need to be separately tracked here.
 */
export default function PlannerApp() {
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const dashHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // After plan is generated, move focus to the dashboard heading
  useEffect(() => {
    if (!planState) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Give dynamic import a tick to mount before focusing
    const timer = setTimeout(() => dashHeadingRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [planState]);

  function handlePlanGenerated(plan: GeminiResponse, intake: ClientIntake) {
    setPlanState({ plan, intake });
  }

  function handleReset() {
    setPlanState(null);
  }

  if (planState) {
    return (
      <DashboardView
        plan={planState.plan}
        eventDate={planState.intake.eventDate}
        location={planState.intake.location}
        onReset={handleReset}
        headingRef={dashHeadingRef}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Plan Your Perfect Event{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-500">
            with AI
          </span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Weddings, birthdays, and community gatherings — get a complete plan with budget
          breakdowns, timelines, vendor checklists, and personalised ideas in seconds.
        </p>
      </div>

      {/* Wizard */}
      <EventWizard onPlanGenerated={handlePlanGenerated} />
    </div>
  );
}
