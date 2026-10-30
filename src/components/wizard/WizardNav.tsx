import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
      <Button
        type="button"
        variant="secondary"
        onClick={onBack}
        disabled={currentStep === 0 || isLoading}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </Button>

      {/*
       * Forward / Generate button.
       * When loading: aria-disabled keeps focus on the button while
       * preventing the action, which is better than `disabled` removing focus.
       */}
      <Button
        type="button"
        variant="primary"
        aria-disabled={isLoading}
        onClick={isLoading ? (e) => e.preventDefault() : onNext}
        className={isLoading ? "opacity-60 cursor-not-allowed" : ""}
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
      </Button>
    </div>
  );
}
