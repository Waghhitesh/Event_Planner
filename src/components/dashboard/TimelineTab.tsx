"use client";

/**
 * @file components/dashboard/TimelineTab.tsx
 * @description Planning timeline tab with persistent checkbox state.
 * Checked tasks are persisted in localStorage keyed by a hash of the plan.
 */

import { memo, useId, useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { GeminiResponse } from "@/lib/schemas";

// ---------------------------------------------------------------------------
// localStorage persistence helpers
// ---------------------------------------------------------------------------

/**
 * Derives a stable cache key from the event name and total cost.
 * Not a cryptographic hash — just a stable, collision-resistant string.
 */
function planStorageKey(plan: GeminiResponse): string {
  const slug = `${plan.eventName}-${plan.totalEstimatedCost}`.replace(/\s+/g, "-");
  return `eventpulse-tasks-${slug}`;
}

function loadCheckedTasks(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) return new Set(arr as string[]);
  } catch {
    // localStorage unavailable or corrupt — fail silently
  }
  return new Set<string>();
}

function saveCheckedTasks(key: string, tasks: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...tasks]));
  } catch {
    // Storage unavailable — fail silently
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TimelineTabProps {
  plan: GeminiResponse;
}

/**
 * Renders the chronological event planning timeline with checkable tasks.
 * Task check state persists across tab switches via localStorage.
 */
const TimelineTab = memo(function TimelineTab({ plan }: TimelineTabProps) {
  const headingId = useId();
  const storageKey = planStorageKey(plan);

  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  // Load persisted state on mount
  useEffect(() => {
    setCheckedTasks(loadCheckedTasks(storageKey));
  }, [storageKey]);

  const toggleTask = useCallback(
    (key: string) => {
      setCheckedTasks((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveCheckedTasks(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const sorted = [...plan.timeline].sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        Planning Timeline
      </h2>
      <ol className="relative space-y-0" aria-label="Event planning phases">
        {sorted.map((phase, phaseIdx) => (
          <li key={`${phase.phase}-${phase.daysBeforeEvent}`} className="relative pl-8 pb-6">
            {/* Vertical connector */}
            {phaseIdx < sorted.length - 1 && (
              <span
                className="absolute left-3 top-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                aria-hidden="true"
              />
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
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {phase.phase}
                </h4>
                <span className="text-xs bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-800">
                  {phase.daysBeforeEvent === 0 ? "🎉 Event Day" : `${phase.daysBeforeEvent} days before`}
                </span>
              </div>

              <ul className="space-y-1.5" aria-label={`Tasks for ${phase.phase}`}>
                {phase.tasks.map((task, taskIdx) => {
                  const taskKey = `${phase.phase}-${taskIdx}`;
                  const checked = checkedTasks.has(taskKey);
                  const checkboxId = `task-${taskKey.replace(/\s+/g, "-")}`;
                  return (
                    <li key={taskKey}>
                      <label
                        htmlFor={checkboxId}
                        className="flex items-start gap-2 cursor-pointer group focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-1 rounded"
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(taskKey)}
                          className="sr-only"
                        />
                        <span aria-hidden="true" className="mt-0.5 flex-shrink-0">
                          {checked ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-400 transition-colors" />
                          )}
                        </span>
                        <span
                          className={`text-xs leading-relaxed ${
                            checked
                              ? "line-through text-gray-400 dark:text-gray-600"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
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
});

export default TimelineTab;
