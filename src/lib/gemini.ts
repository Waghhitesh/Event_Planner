/**
 * @file gemini.ts
 * @description Gemini client configuration and structured-response schema
 * definition for EventPulse AI.
 *
 * Client initialisation is LAZY — the GoogleGenerativeAI instance is only
 * created on first use, so importing this module at the top of a route file
 * does NOT throw if GEMINI_API_KEY is missing (the route handler returns 503
 * with a clear message instead).
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
  type Schema,
} from "@google/generative-ai";
import { DEFAULT_GEMINI_MODEL } from "./config";
import { SYSTEM_INSTRUCTION } from "./prompt";

// ---------------------------------------------------------------------------
// Lazy client singleton
// ---------------------------------------------------------------------------

let _genAI: GoogleGenerativeAI | null = null;

/**
 * Returns the shared GoogleGenerativeAI instance, initialising it on first
 * call. Throws a descriptive error if GEMINI_API_KEY is not set so the
 * route handler can convert it to a 503 response.
 */
export function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

// ---------------------------------------------------------------------------
// Structured JSON response schema (mirrors GeminiResponseSchema in schemas.ts)
// ---------------------------------------------------------------------------

export const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  description: "Complete event planning output from EventPulse AI",
  properties: {
    eventName: {
      type: SchemaType.STRING,
      description: "Creative, personalised name for the event",
    },
    themeSummary: {
      type: SchemaType.STRING,
      description: "Two-to-three sentence summary of the chosen event theme",
    },
    totalEstimatedCost: {
      type: SchemaType.NUMBER,
      description: "Total estimated cost for the event in the user's currency",
    },
    budgetBreakdown: {
      type: SchemaType.ARRAY,
      description: "Itemised budget allocation across spending categories",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: {
            type: SchemaType.STRING,
            description: "Spending category name (e.g. Catering, Décor)",
          },
          allocatedAmount: {
            type: SchemaType.NUMBER,
            description: "Money allocated to this category",
          },
          priority: {
            type: SchemaType.STRING,
            format: "enum",
            description: "Importance level: critical | high | medium | low",
            enum: ["critical", "high", "medium", "low"],
          },
          costSavingTip: {
            type: SchemaType.STRING,
            description: "Actionable tip to reduce cost in this category",
          },
        },
        required: ["category", "allocatedAmount", "priority", "costSavingTip"],
      },
    },
    timeline: {
      type: SchemaType.ARRAY,
      description: "Chronological planning phases counting down to event day",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          phase: {
            type: SchemaType.STRING,
            description: "Name of the planning phase",
          },
          daysBeforeEvent: {
            type: SchemaType.NUMBER,
            description:
              "Number of days before the event when this phase starts (0 = event day)",
          },
          tasks: {
            type: SchemaType.ARRAY,
            description: "Concrete tasks to complete during this phase",
            items: { type: SchemaType.STRING },
          },
        },
        required: ["phase", "daysBeforeEvent", "tasks"],
      },
    },
    vendorChecklist: {
      type: SchemaType.ARRAY,
      description: "Services to source and vendor vetting interview questions",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          service: {
            type: SchemaType.STRING,
            description: "Vendor service type (e.g. Photography, Catering)",
          },
          estimatedCost: {
            type: SchemaType.NUMBER,
            description: "Estimated cost for this vendor service",
          },
          vettingQuestions: {
            type: SchemaType.ARRAY,
            description: "Questions to ask vendors before booking to ensure quality",
            items: { type: SchemaType.STRING },
          },
          status: {
            type: SchemaType.STRING,
            format: "enum",
            description:
              "Current booking status: not_started | researching | contacted | booked",
            enum: ["not_started", "researching", "contacted", "booked"],
          },
        },
        required: ["service", "estimatedCost", "vettingQuestions", "status"],
      },
    },
    personalizedIdeas: {
      type: SchemaType.ARRAY,
      description: "Creative, personalised ideas tailored to the event profile",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          idea: {
            type: SchemaType.STRING,
            description: "Short title of the idea",
          },
          implementationDetails: {
            type: SchemaType.STRING,
            description: "Step-by-step implementation guidance",
          },
        },
        required: ["idea", "implementationDetails"],
      },
    },
  },
  required: [
    "eventName",
    "themeSummary",
    "totalEstimatedCost",
    "budgetBreakdown",
    "timeline",
    "vendorChecklist",
    "personalizedIdeas",
  ],
};

// ---------------------------------------------------------------------------
// Generation configuration
// ---------------------------------------------------------------------------

export const generationConfig: GenerationConfig = {
  temperature: 0.2,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema,
};

// ---------------------------------------------------------------------------
// Model factory
// ---------------------------------------------------------------------------

/**
 * Returns a configured Gemini model instance with the system instruction
 * pre-loaded. Uses the GEMINI_MODEL env var or DEFAULT_GEMINI_MODEL.
 * Calls getGenAI() which will throw if the API key is missing.
 */
export function getGeminiModel() {
  const modelName = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return getGenAI().getGenerativeModel({
    model: modelName,
    generationConfig,
    systemInstruction: SYSTEM_INSTRUCTION,
  });
}
