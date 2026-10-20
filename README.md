# EventPulse AI 🎉

> **Enterprise-grade, accessible event orchestration engine** powered by Google Gemini 1.5 Flash — plan weddings, birthdays, and community gatherings with AI-generated budgets, timelines, vendor checklists, and personalised ideas.

[![CI/CD](https://github.com/your-org/eventpulse-ai/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-org/eventpulse-ai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![Cost: $0](https://img.shields.io/badge/Cost-%240-green.svg)]()

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Feature Highlights](#feature-highlights)
3. [Tech Stack](#tech-stack)
4. [Google Ecosystem Integration](#google-ecosystem-integration)
5. [Architecture Diagram](#architecture-diagram)
6. [Security Audit](#security-audit)
7. [Accessibility](#accessibility)
8. [Local Setup Guide](#local-setup-guide)
9. [Running Tests](#running-tests)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Project Structure](#project-structure)

---

## Project Overview

EventPulse AI is a Next.js 14 App Router application that lets users describe their event and instantly receive a comprehensive, AI-generated plan. It uses **Google Gemini 1.5 Flash** with structured JSON schema enforcement to guarantee every response follows a validated shape — no hallucinated formats, no unexpected data.

### Event Types Supported

| Event Type | Budget Breakdown | Timeline | Vendor Types | Ideas |
|---|---|---|---|---|
| 💍 Wedding | Venue, Catering, Photography, Décor, Music, Honeymoon, etc. | 6+ phases from 180 days out | Photographer, Caterer, DJ, Florist, Officiant, etc. | Cultural customs, DIY décor, surprise moments |
| 🎂 Birthday | Venue/Home, Catering, Cake, Entertainment, Gifts, etc. | 6+ phases from 60 days out | Caterer, Entertainer, Photographer, Decorator | Personalised playlists, photo slideshows, themes |
| 🏘️ Community | Venue, Logistics, Permits, Catering, AV Equipment, etc. | 6+ phases from 90 days out | Event Manager, AV Technician, Security, Caterer | Sponsorship, volunteer coordination, livestream |

---

## Feature Highlights

- **Multi-Step Wizard** — 4-step accessible intake form with real-time validation
- **AI-Powered Planning** — Gemini 1.5 Flash generates contextual plans with structured JSON
- **Budget Progress Bars** — Visual meters showing allocation per category
- **Interactive Timeline Checklist** — Checkable milestone tasks per phase
- **Collapsible Vendor Vetting** — Accordion panel with interview questions per service
- **Google Calendar Sync** — 1-click pre-filled calendar event (no OAuth required)
- **Google Sheets Export** — Download complete plan as RFC 4180 CSV, importable directly into Google Sheets
- **Dark Mode** — System preference honoured via Tailwind CSS
- **Fully Keyboard Navigable** — Tab, arrow keys, Enter/Space on all interactive elements

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | TailwindCSS + Radix UI primitives |
| Icons | Lucide React |
| AI SDK | `@google/generative-ai` (Gemini 1.5 Flash) |
| Validation | Zod |
| Testing | Vitest + jsdom |
| CI/CD | GitHub Actions |
| Secret Scanning | TruffleHog OSS |

---

## Google Ecosystem Integration

| Integration | Implementation | OAuth Required |
|---|---|---|
| **Gemini 1.5 Flash** | `@google/generative-ai` SDK — structured JSON schema with `responseMimeType: "application/json"` | No (API key only) |
| **Google Calendar** | Deep-link URL (`calendar.google.com/calendar/render?action=TEMPLATE&...`) — pre-fills title, date, description, location | No |
| **Google Sheets** | RFC 4180 CSV download — direct drag-and-drop import into Sheets | No |

> **Cost: $0** — All integrations use free tiers or open web standards.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  ┌──────────────────┐        ┌─────────────────────────────┐   │
│  │   EventWizard    │ POST   │       DashboardView         │   │
│  │  (multi-step     │──────▶│  Budget | Timeline | Vendors │   │
│  │   intake form)   │       │  Ideas  | Google Integration  │   │
│  └──────────────────┘       └─────────────────────────────┘   │
│           │                            │                        │
│     sanitizeInput()             Google Calendar URL            │
│     xmlWrap()                   CSV download (local)           │
└───────────┼────────────────────────────────────────────────────┘
            │ HTTPS POST /api/plan
            ▼
┌───────────────────────────────────────────────────────────────┐
│                   Next.js Edge / Node Runtime                  │
│                                                                │
│   src/app/api/plan/route.ts                                   │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ 1. Parse body                                         │   │
│   │ 2. Validate with ClientIntakeSchema (Zod)             │   │
│   │ 3. sanitizeInput() all string fields                  │   │
│   │ 4. Wrap in <user_input> XML boundaries                │   │
│   │ 5. Build system prompt with XML-sandboxed user data   │   │
│   │ 6. Call Gemini 1.5 Flash (temp=0.2, JSON schema)      │   │
│   │ 7. Parse & validate response with GeminiResponseSchema│   │
│   │ 8. Return validated JSON to client                    │   │
│   └───────────────────────────────────────────────────────┘   │
└───────────────────────────────┼───────────────────────────────┘
                                │ HTTPS
                                ▼
                   ┌────────────────────────┐
                   │  Google AI Studio API  │
                   │  Gemini 1.5 Flash      │
                   │  (Free tier)           │
                   └────────────────────────┘
```

---

## Security Audit

### Threat Model

| Threat | Mitigation |
|---|---|
| **Prompt Injection** | `sanitizeInput()` strips 20+ known injection patterns (system:, developer:, [INST], DAN, jailbreak phrases) iteratively |
| **Role Hijacking** | All user input wrapped in `<user_input>` XML boundaries; system instructions explicitly tell the model to treat tag contents as data only |
| **XSS via AI Output** | AI response validated by Zod `GeminiResponseSchema` — only structured fields are accepted; raw strings are not rendered as HTML |
| **Schema Spoofing** | `responseMimeType: "application/json"` + `responseSchema` enforce structured output at the API level |
| **Secret Leakage** | TruffleHog runs on every push; `.env.local` is gitignored; API key never exposed client-side |
| **Input Length Attacks** | Hard 2000-character cap enforced in `sanitizeInput()` before any regex processing |
| **Control Character Injection** | Strips all ASCII control characters (0x00–0x1F, 0x7F) except tab, LF, CR |
| **Excessive API Calls** | One Gemini call per plan request; no caching required (stateless per user session) |

### Security Functions

- [`src/lib/security.ts`](src/lib/security.ts) — `sanitizeInput()`, `xmlWrap()`
- [`src/app/api/plan/route.ts`](src/app/api/plan/route.ts) — Input validation → sanitisation → XML sandboxing → schema validation pipeline

---

## Accessibility

EventPulse AI targets **WCAG 2.1 AA** compliance:

| Criterion | Implementation |
|---|---|
| Keyboard Navigation | All buttons, inputs, tabs, and checkboxes are reachable via Tab; tabs implement arrow-key roving `tabindex` per ARIA authoring practices |
| Screen Reader Support | `role="tablist/tab/tabpanel"`, `role="progressbar"`, `role="meter"`, `role="alert"` (live regions), `aria-expanded`, `aria-controls`, `aria-labelledby`, `aria-describedby` |
| Focus Management | Wizard step changes programmatically move focus to step heading via `ref.focus()` |
| Skip Link | "Skip to main content" link visible on focus for keyboard users |
| Error Announcements | Field errors use `role="alert"` + `aria-invalid` + `aria-describedby` |
| Colour Contrast | Violet-600 on white (#6d28d9 / #ffffff) — contrast ratio > 7:1 (AAA) |
| Progress Indicators | Both text ("Step 2 of 4") and ARIA `aria-valuenow` on `role="progressbar"` |
| Dark Mode | `prefers-color-scheme` honoured; all colour tokens have dark variants |

---

## Local Setup Guide

### Prerequisites

- **Node.js** >= 18.17
- **npm** >= 9
- A free [Google AI Studio](https://aistudio.google.com/) API key

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-org/eventpulse-ai.git
cd eventpulse-ai

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and set your GEMINI_API_KEY

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key for Gemini 1.5 Flash |

Get your free API key at: **https://aistudio.google.com/app/apikey**

---

## Running Tests

```bash
# Run all Vitest unit tests once
npm run test

# Watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

| Suite | Tests | Description |
|---|---|---|
| **Security** | 10 | injection vectors, control chars, length limits, benign text preservation |
| **Budget Math** | 4 | sum accuracy, non-negative amounts, Zod schema validation |
| **Google Calendar** | 7 | URL format, YYYYMMDD dates, encoding, parsability |
| **Google Sheets CSV** | 8 | sections, CRLF endings, quoting, event name embedding |
| **Zod Schemas** | 8 | valid intake, invalid event types, past dates, zero budget |

---

## CI/CD Pipeline

```
Push / PR to main or develop
         │
         ├──▶ [1] TruffleHog Secret Scan  (parallel)
         ├──▶ [2] ESLint                  (parallel)
         └──▶ [3] TypeScript Type Check   (parallel)
                        │
                        ▼ (needs: lint)
                  [4] Vitest Unit Tests
                        │
                        ▼ (needs: lint + typecheck + test)
                  [5] Next.js Build Verification
                        │
                        ▼
                  Upload build artifact
```

All jobs run on `ubuntu-latest` with Node.js 20.

---

## Project Structure

```
eventpulse-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── plan/
│   │   │       └── route.ts          # POST /api/plan — Gemini orchestration
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page (wizard to dashboard)
│   ├── components/
│   │   ├── EventWizard.tsx           # Multi-step accessible intake form
│   │   └── DashboardView.tsx         # Tabbed plan dashboard + Google integrations
│   ├── lib/
│   │   ├── schemas.ts                # Zod validation schemas
│   │   ├── security.ts               # sanitizeInput(), xmlWrap()
│   │   ├── gemini.ts                 # Gemini 1.5 Flash client + responseSchema
│   │   └── google-integrations.ts   # Calendar URL + Sheets CSV generator
│   └── tests/
│       └── planner.test.ts           # Vitest unit tests (37 tests)
├── .github/
│   └── workflows/
│       └── ci-cd.yml                 # GitHub Actions CI/CD pipeline
├── .env.example                      # Environment variable template
├── vitest.config.ts                  # Vitest configuration
├── tailwind.config.ts                # TailwindCSS config
├── tsconfig.json                     # TypeScript config (strict mode)
└── README.md                         # This file
```

---

## License

MIT © 2024 EventPulse AI Contributors
