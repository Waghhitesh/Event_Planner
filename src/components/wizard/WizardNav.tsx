import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

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
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0 || isLoading}
        className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:from-violet-700 hover:to-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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
