/**
 * @file src/tests/fixtures.ts
 * @description Shared test fixtures for EventPulse AI test suites.
 */

import type { GeminiResponse, ClientIntake } from "../lib/schemas";

export const VALID_INTAKE: ClientIntake = {
  eventType: "wedding",
  eventDate: "2027-06-15",
  location: "Grand Ballroom, Mumbai",
  totalBudget: 500000,
  guestCount: 150,
  themePreferences: "Rustic bohemian with fairy lights",
  specialRequirements: "Vegan menu options required",
};

export const MOCK_PLAN: GeminiResponse = {
  eventName: "A Rustic Romance",
  themeSummary: "An intimate bohemian wedding with fairy lights and blush tones.",
  totalEstimatedCost: 500000,
  budgetBreakdown: [
    { category: "Catering", allocatedAmount: 150000, priority: "critical", costSavingTip: "Opt for a set menu" },
    { category: "Venue", allocatedAmount: 100000, priority: "critical", costSavingTip: "Book off-peak" },
    { category: "Photography", allocatedAmount: 80000, priority: "high", costSavingTip: "Package deals save" },
    { category: "Décor", allocatedAmount: 70000, priority: "high", costSavingTip: "DIY centrepieces" },
    { category: "Music & Entertainment", allocatedAmount: 60000, priority: "medium", costSavingTip: "Local artists" },
    { category: "Miscellaneous", allocatedAmount: 40000, priority: "low", costSavingTip: "Buffer for overruns" },
  ],
  timeline: [
    { phase: "Initial Planning", daysBeforeEvent: 180, tasks: ["Set vision board", "Book venue", "Engage caterer"] },
    { phase: "Vendor Finalisation", daysBeforeEvent: 120, tasks: ["Confirm photographer", "Sign caterer contract"] },
    { phase: "Invitations", daysBeforeEvent: 90, tasks: ["Send save-the-dates", "Finalise guest list"] },
    { phase: "Décor & Logistics", daysBeforeEvent: 60, tasks: ["Order décor items", "Arrange transport"] },
    { phase: "Final Preparations", daysBeforeEvent: 14, tasks: ["Confirm all vendors", "Rehearsal dinner"] },
    { phase: "Event Day", daysBeforeEvent: 0, tasks: ["Final vendor check", "Enjoy the celebration"] },
  ],
  vendorChecklist: [
    {
      service: "Photography",
      estimatedCost: 80000,
      vettingQuestions: [
        "Can we see a full wedding gallery?",
        "Do you use backup equipment?",
        "What is your editing turnaround?",
        "Do you work with an assistant?",
      ],
      status: "not_started",
    },
    {
      service: "Catering",
      estimatedCost: 150000,
      vettingQuestions: [
        "Can you accommodate vegan diets?",
        "What is included in the package?",
        "Do you handle setup and cleanup?",
        "What licences do you hold?",
      ],
      status: "not_started",
    },
    {
      service: "Venue",
      estimatedCost: 100000,
      vettingQuestions: [
        "What is the capacity?",
        "Is parking available?",
        "What is the cancellation policy?",
        "Are outside vendors allowed?",
      ],
      status: "not_started",
    },
    {
      service: "Florist",
      estimatedCost: 30000,
      vettingQuestions: [
        "Do you offer seasonal blooms?",
        "Can you work within our colour palette?",
        "Do you handle delivery and setup?",
        "What is your lead time?",
      ],
      status: "not_started",
    },
    {
      service: "DJ / Band",
      estimatedCost: 60000,
      vettingQuestions: [
        "Can we provide a playlist?",
        "Do you have liability insurance?",
        "What is your setup time?",
        "Do you take requests on the night?",
      ],
      status: "not_started",
    },
  ],
  personalizedIdeas: [
    {
      idea: "Fairy Light Canopy",
      implementationDetails: "Drape Edison bulb strands across the ceiling at varying heights.",
    },
    {
      idea: "Personalised Seed Packets",
      implementationDetails: "Send guests home with wildflower seed packets labelled with the couple's names.",
    },
    {
      idea: "Photo Polaroid Wall",
      implementationDetails: "Hang a rope grid where guests pin Polaroid shots taken during the reception.",
    },
    {
      idea: "Live Calligraphy Station",
      implementationDetails: "A calligrapher personalises keepsake items on the night for guests.",
    },
  ],
};
