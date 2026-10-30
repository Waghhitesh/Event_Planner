import type { WizardStep } from "./types";

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2" aria-hidden="true">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              idx <= currentStep
                ? "text-violet-600 dark:text-violet-400"
                : "text-gray-500 dark:text-gray-500"
            }`}
          >
            <span aria-hidden="true">{step.icon}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
        ))}
      </div>
      <div
        className="h-2 rounded-full bg-gray-200 dark:bg-gray-700"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Step ${currentStep + 1} of ${steps.length}: ${progressPercent}% complete`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
