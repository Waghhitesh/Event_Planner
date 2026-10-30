import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

/** Shared focus-ring classes reused by both nav buttons. */
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

interface WizardNavProps {
  currentStep: number;
  totalSteps: number;
  isLoading: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function WizardNav({
  currentStep,
  totalSteps,
  isLoading,
  onBack,
  onNext,
}: WizardNavProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {/* Back button — truly disabled (not in loading path, focus loss acceptable) */}
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0 || isLoading}
        className={`flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS_RING}`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      {/*
       * Forward / Generate button.
       * When loading: aria-disabled keeps focus on the button while
       * preventing the action, which is better than `disabled` removing focus.
       */}
      <button
        type="button"
        aria-disabled={isLoading}
        onClick={isLoading ? (e) => e.preventDefault() : onNext}
        className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:from-violet-700 hover:to-purple-700 shadow-sm ${isLoading ? "opacity-60 cursor-not-allowed" : ""} ${FOCUS_RING}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Generating Plan…</span>
          </>
        ) : currentStep === totalSteps - 1 ? (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Generate Plan
          </>
        ) : (
          <>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}
