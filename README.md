# EventPulse AI 🎉

**Enterprise-grade, accessible event orchestration engine powered by Google Gemini Flash.**

[![CI/CD](https://github.com/Waghhitesh/Event_Planner/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Waghhitesh/Event_Planner/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)

---

## Project Overview

EventPulse AI helps users plan weddings, birthdays, and community gatherings with a single form submission. In seconds it generates:

- **Budget breakdown** — categorised allocations with cost-saving tips
- **Planning timeline** — 6+ chronological phases from 180 days out to event day
- **Vendor checklist** — 5+ services with vetting interview questions
- **Personalised ideas** — 4+ creative, actionable suggestions tailored to theme and budget

Plans can be exported directly to **Google Calendar** (deep link, zero OAuth) and **Google Sheets** (RFC 4180 CSV download). No paid services required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| UI | TailwindCSS v4, Lucide React |
| AI | Google Gemini Flash (`@google/generative-ai`) |
| Validation | Zod v4 |
| Testing | Vitest v5 (188 tests, node environment) |
| CI/CD | GitHub Actions (6 jobs: secret scan, install, lint, typecheck, audit, test, build) |

---

## Google Ecosystem Integration

| Feature | Implementation | Cost |
|---|---|---|
| AI plan generation | Gemini Flash structured JSON | Free tier |
| Google Calendar sync | Deep-link URL (no OAuth) | Free |
| Google Sheets export | RFC 4180 CSV download | Free |
| Secret scanning | TruffleHog OSS GitHub Action | Free |
| Dependency updates | GitHub Dependabot | Free |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Client)                     │
│  ┌──────────────┐      ┌────────────────────────────┐   │
│  │  EventWizard  │─────▶│       PlannerApp           │   │
│  │  (4-step form)│      │  (state: wizard | dash)    │   │
│  └──────────────┘      └─────────────┬──────────────┘   │
│                                       │                   │
│                         ┌─────────────▼──────────────┐   │
│                         │      DashboardView          │   │
│                         │  Budget│Timeline│Vendors│   │   │
│                         │        Ideas│GoogleActions  │   │
│                         └─────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────┘
                              │ POST /api/plan
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js App Router (Server)             │
│                                                           │
│   Rate Limiter (5 req/min/IP)                             │
│       │                                                   │
│   Body Size Check (10 KB limit)                           │
│       │                                                   │
│   Plan Cache (SHA-256 key, 10 min TTL)                    │
│       │                                                   │
│   Zod Validation ──▶ buildUserPrompt (XML-sandboxed)      │
│       │                                                   │
│   Gemini Flash API (systemInstruction + user turn)        │
│       │                                                   │
│   JSON Parse + Zod Schema Validation                      │
│       │                                                   │
│   validatePlanInvariants ──▶ Retry / normalisePlan        │
│       │                                                   │
│   sanitizeOutput (control char strip)                     │
│       │                                                   │
│   Return plan JSON (Cache-Control: no-store)              │
└─────────────────────────────────────────────────────────┘
```

---

## Security Audit

| Vector | Mitigation |
|---|---|
| Prompt injection | NFKC normalisation → zero-width/bidi strip → iterative pattern matching → XML-escaping in `xmlWrap` |
| Role prefix hijack | Regex anchored at `^\s*(role)\s*:` (multiline) — won't strip "Sound system: 2 speakers" |
| Output control chars | `sanitizeOutput()` applied to every AI string field before returning |
| Oversized requests | 413 if `Content-Length > 10 KB` |
| API abuse | Sliding-window rate limiter: 5 requests/minute/IP, 429 + `Retry-After` |
| Secrets in repo | TruffleHog OSS scans every push; `.env*` gitignored, `.env.example` committed instead |
| Supply chain | Dependabot weekly PRs; `npm audit --omit=dev --audit-level=high` in CI |
| CSV injection | Formula cells (`=`, `-`, `+`, `@`) prefixed with `'` before RFC 4180 quoting |
| Filename injection | `slugifyFilename()` replaces `/\:*?"<>|` before download |
| HTTP headers | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS |

---

## Design Decisions

- **Lazy Gemini init** — `getGenAI()` only runs on first API call. Routes return `503` with a clear message if the key is missing, instead of crashing at import time.
- **In-memory cache** — LRU+TTL (100 entries, 10 min) keyed by SHA-256 of the normalised intake. Identical plans are served without hitting the Gemini quota.
- **Plan normalisation** — If Gemini returns arithmetic-inconsistent budgets after one retry, `normalisePlan()` scales items deterministically rather than returning an error to the user.
- **Tab state preservation** — All dashboard tab panels are rendered with `hidden` (not conditionally mounted). Timeline checkboxes and vendor expand state survive tab switches. Checked tasks are persisted in `localStorage`.
- **Server Component page** — `app/page.tsx` is a React Server Component; only `PlannerApp` is a Client Component, minimising the client bundle.
- **Single-sourced config** — `src/lib/config.ts` owns all limits, model names and thresholds. UI, schemas, security, and the route all import from it.

---

## Accessibility (WCAG 2.1 AA)

- Full keyboard navigation (Tab, Arrow keys, Home/End on tab list)
- `role="progressbar"` on the progress track element with `aria-valuenow/min/max`
- Separate `role="status"` live region for loading announcements
- Dashboard event name is `<h1>` with programmatic focus on plan reveal
- Focus moves to first invalid field on step validation failure
- Timeline checkboxes use `focus-within` visible ring on the label
- All icon buttons have `aria-label` and minimum 44×44 px touch targets
- `prefers-reduced-motion` disables all CSS transitions/animations globally
- Print stylesheet included; "Print / Save as PDF" button on dashboard

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/Waghhitesh/Event_Planner.git
cd Event_Planner

# 2. Install
npm install --legacy-peer-deps

# 3. Configure
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
# Get a free key at: https://aistudio.google.com/app/apikey

# 4. Run
npm run dev
# → http://localhost:3000

# 5. Test
npm test

# 6. Build
npm run build
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | — | Google AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Override the Gemini model |

---

## File Structure

```
src/
├── app/
│   ├── api/plan/route.ts     — POST /api/plan (rate limit, cache, Gemini, validation)
│   ├── error.tsx             — Route error boundary
│   ├── global-error.tsx      — Root layout error boundary
│   ├── globals.css           — TailwindCSS v4 + print + reduced-motion styles
│   ├── layout.tsx            — Root layout (metadata, viewport, OG)
│   ├── loading.tsx           — Route loading skeleton
│   ├── not-found.tsx         — 404 page
│   └── page.tsx              — Server Component (header, hero, footer)
├── components/
│   ├── dashboard/
│   │   ├── BudgetTab.tsx     — Budget breakdown with progress bars
│   │   ├── GoogleActions.tsx — Calendar sync, CSV export, Print button
│   │   ├── IdeasTab.tsx      — Personalised ideas grid
│   │   ├── TimelineTab.tsx   — Timeline with localStorage-persisted checkboxes
│   │   └── VendorsTab.tsx    — Vendor checklist with collapsible vetting questions
│   ├── DashboardView.tsx     — Tabbed dashboard shell
│   ├── EventWizard.tsx       — 4-step WCAG 2.1 AA intake wizard
│   └── PlannerApp.tsx        — Client-side wizard↔dashboard state orchestrator
└── lib/
    ├── config.ts             — Single-sourced constants (model, limits, thresholds)
    ├── date.ts               — Timezone-safe date helpers
    ├── gemini.ts             — Lazy Gemini client, responseSchema, model factory
    ├── google-integrations.ts — Calendar URL, CSV export, filename slugifier
    ├── plan-validation.ts    — Plan invariant validator + deterministic normaliser
    ├── prompt.ts             — System instruction + user/corrective prompt builders
    ├── schemas.ts            — Zod schemas (intake + Gemini response)
    └── security.ts           — sanitizeInput, xmlWrap, sanitizeOutput
tests/
    ├── fixtures.ts           — Shared MOCK_PLAN and VALID_INTAKE
    ├── google-integrations.test.ts
    ├── plan-validation.test.ts
    ├── planner.test.ts       — Legacy entry point (re-exports all suites)
    ├── prompt.test.ts
    ├── route.test.ts
    ├── schemas.test.ts
    └── security.test.ts
```

---

## Test Coverage

| Suite | Tests | Focus |
|---|---|---|
| security | 22 | sanitizeInput, xmlWrap, Unicode evasion, false-positive regression |
| schemas | 12 | Zod intake + response validation, SDK/Zod key parity |
| google-integrations | 17 | Calendar URL, CSV export, formula injection, filename slug |
| plan-validation | 13 | Invariant checks, normalisation, budget arithmetic |
| prompt | 11 | System instruction, XML sandbox, corrective prompt |
| route | 13 | Happy path, 400/413/429/502/503, cache, rate limit, injection |
| **Total** | **188** | — |

---

## Repository

**GitHub**: [github.com/Waghhitesh/Event_Planner](https://github.com/Waghhitesh/Event_Planner)

**License**: [MIT](./LICENSE) © 2026 Waghhitesh
