# Technical architecture and data flow

*Internal document: provided to the school's IT contact on request; not published in the application.*

## Overview

```
                         Browser (phone / tablet / PC)
                                    │  HTTPS
                                    ▼
             https://www.voxvision.site  (existing VoxVision site, Next.js on Vercel)
                    │                                  │
   all other paths  │                                  │  /mananvidyademo/*  (rewrite, multi-zone)
                    ▼                                  ▼
          VoxVision marketing site           VoxVision School OS  (this application)
           (unchanged code)                   Next.js 16 App Router, Node.js runtime
                                                       │
                     ┌───────────────────┬─────────────┼───────────────────────┐
                     ▼                   ▼             ▼                       ▼
            PostgreSQL database    Claude API     Pyodide CDN           (future, with approval)
            (DATABASE_URL)         (optional,     (browser only,         School ERP / SMS /
                                    server-side)   for Python lessons)   WhatsApp connectors
```

- **Multi-zone deployment.** School OS is a separate Next.js application with `basePath: "/mananvidyademo"`. The main VoxVision site adds one rewrite rule so the subpath is served by School OS. The existing site's pages and code are untouched, and School OS secrets live only in its own deployment.
- **Server-rendered pages.** Pages read data on the server (React Server Components) and render HTML; small client components handle interaction (forms, quiz, charts, code runners).
- **API routes.** All changes go through JSON route handlers under `/mananvidyademo/api/…` (see *Database and API documentation*).
- **Database.** PostgreSQL. Production uses `pg` with a connection string. Local development and automated tests use PGlite, an embedded PostgreSQL build, so the same SQL runs everywhere. The schema is applied idempotently at start-up and by `npm run db:migrate`.

## Code layout

```
src/
  app/                    pages (App Router) and API routes
    page.tsx              proposal overview (public)
    admissions/           public admissions assistant
    guide/                client-facing documentation viewer
    login/                sign-in
    app/                  authenticated application (layout checks session)
    api/                  JSON route handlers
  components/             shared UI (forms, charts, registers, markdown)
  lib/
    db.ts                 database driver selection and type parsing
    schema.ts             SQL schema
    seed.ts, seed-content.ts   synthetic presentation data
    auth.ts, password.ts  sessions and password hashing
    rbac.ts               roles and permissions (single source of truth)
    http.ts               API wrapper: origin check, errors, body limits, rate limits
    access.ts             data-scope checks (class, subject, own child)
    ai.ts                 Claude integration (server only)
    kb.ts, text.ts, safety.ts  assistant retrieval, decision and screening rules
    quiz.ts, workflows.ts, robot.ts, reports.ts, commercial.ts  domain logic
docs/                     this documentation package
scripts/                  e2e tests, database CLI, doc table generator
tests/                    unit and database tests (Vitest)
deploy/                   rewrite patch for the main site, deployment notes
```

## Request flow: a student takes a quiz

```
Student browser                 School OS server                      Database
──────────────                  ────────────────                      ────────
GET /app/quiz/12  ───────────▶  session cookie → user (role student)
                                check quiz is published and for the
                                student's class level ─────────────▶  quizzes, classes
                                select questions WITHOUT answers ──▶  quiz_questions, questions
               ◀───────────── HTML with prompts and options only
POST /api/quizzes/12/attempt
{answers} + Origin header ───▶  origin check, session, permission,
                                rate limit, validate body
                                load answer key ──────────────────▶  questions
                                score on server
                                save attempt + learning event ────▶  quiz_attempts, learning_events
               ◀───────────── score, correct options, explanations
```

## Request flow: admissions assistant

```
Parent ─▶ POST /api/assistant {question, lang}
           ├─ rate limit (30 / 10 min per connection)
           ├─ sensitivity check (fees, guarantees, health, safety, complaints) ──▶ escalate
           ├─ match against published knowledge-base entries ──▶ none confident ──▶ escalate
           ├─ answer = verified text in chosen language
           ├─ (optional) Claude rewords using ONLY those entries
           └─ log question + outcome (no identity) ──▶ assistant_logs
```

## Request flow: hostel leave

```
Parent ─▶ POST /api/hostel/leave ─▶ validations (boarder, times, overlap) ─▶ leave_requests (pending)
Warden ─▶ PATCH /api/hostel/leave/{id} {to: approved|rejected (note)} ─▶ status_history, audit_log
Warden ─▶ PATCH … {to: checked_out} … {to: returned}
Roll-call page ─▶ pre-marks "on leave" from approved/checked-out requests covering the date
Hostel overview / command centre ─▶ read live counts
```

## AI integration

- Server-side only. Provider is Anthropic Claude (official TypeScript SDK) or Google Gemini (REST API), selected with `AI_PROVIDER`. The API key is read from the environment and never sent to the browser.
- Default model `claude-opus-5-5` (configurable with `AI_MODEL`), with server-side refusal fallback enabled (`fallbacks: "default"`).
- Effort is set per task: `low` for student explanations and admissions rewording, `medium` for lesson plans and question drafting.
- Question drafting uses structured output (a validated JSON schema) and a second defensive validation before saving.
- Per-user hourly cap (`AI_HOURLY_LIMIT_PER_USER`, default 30). Errors and refusals fall back to non-AI behaviour with an honest message.

## Security architecture (summary)

| Layer | Control |
|---|---|
| Transport | HTTPS (hosting provider); session cookie `Secure` in production |
| Session | random 256-bit token, only its SHA-256 hash stored; HttpOnly, SameSite=Lax, Path=/mananvidyademo; 12-hour expiry; deleted on sign-out, role change, deactivation, password reset |
| Passwords | scrypt (N=16384, r=8, p=1) with random salt; minimum policy; lockout after 5 failures for 15 minutes; generic error messages |
| CSRF | state-changing requests must carry an `Origin` matching the host or `ALLOWED_ORIGINS` |
| Authorisation | permission check in every API route and protected page; data-scope checks for class, subject and own child |
| Input | Zod schemas; 64 KB body limit; parameterised SQL only |
| Output | Markdown renderer escapes HTML and unsafe links; CSV formula protection; generic error messages (details only in server logs) |
| Abuse | rate limits on sign-in, assistant, enquiries, tracking, AI and attempts |
| Headers | X-Frame-Options DENY, nosniff, strict referrer policy, permissions policy, COOP; no X-Powered-By; no production source maps |
| Accountability | audit log for sign-ins, changes, decisions and exports |

## Data flow boundaries

- **No data leaves the system** except: (1) AI requests when the school enables AI (question text and approved material only); (2) the Pyodide runtime is downloaded by the student's browser from cdn.jsdelivr.net (no school data is sent).
- **No connection to the school's existing systems** exists in this version. Any future connector is specified in *School ERP integration requirements* and needs written authorisation.
