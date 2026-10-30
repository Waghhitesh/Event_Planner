import type { EventType } from "@/lib/schemas";
import { ClientIntakeSchema } from "@/lib/schemas";
import { Sparkles, CalendarDays, Wallet, ClipboardList } from "lucide-react";
import type { WizardStep } from "./types";
import { createElement } from "react";

export const STEPS: WizardStep[] = [
  {
    id: "event-type",
    label: "Event Type",
    icon: createElement(Sparkles, { className: "h-4 w-4", "aria-hidden": "true" }),
  },
  {
    id: "details",
    label: "Event Details",
    icon: createElement(CalendarDays, { className: "h-4 w-4", "aria-hidden": "true" }),
  },
  {
    id: "budget",
    label: "Budget & Guests",
    icon: createElement(Wallet, { className: "h-4 w-4", "aria-hidden": "true" }),
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: createElement(ClipboardList, { className: "h-4 w-4", "aria-hidden": "true" }),
  },
];

export const EVENT_TYPES: {
  value: EventType;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: "wedding",
    label: "Wedding",
    description: "Celebrate love with an unforgettable ceremony and reception",
    emoji: "💍",
  },
  {
    value: "birthday",
    label: "Birthday",
    description: "Create magical birthday memories for someone special",
    emoji: "🎂",
  },
  {
    value: "community",
    label: "Community Event",
    description: "Bring people together for meaningful shared experiences",
    emoji: "🏘️",
  },
];

export const FIELD_ID_MAP: Record<string, string> = {
  eventType: "event-type-wedding",
  eventDate: "date",
  location: "location",
  currency: "currency",
  totalBudget: "budget",
  guestCount: "guests",
  themePreferences: "theme",
  specialRequirements: "special",
};

export const STEP_SCHEMAS = [
  ClientIntakeSchema.pick({ eventType: true }),
  ClientIntakeSchema.pick({ eventDate: true, location: true }),
  ClientIntakeSchema.pick({ totalBudget: true, guestCount: true, currency: true }),
  ClientIntakeSchema.pick({ themePreferences: true }),
];
