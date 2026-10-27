# VoxVision School OS

The school technology platform VoxVision proposes for **Manan Vidya Manrakhan Mahto School, Ranchi**: AI-supported learning, a teacher workspace, a bilingual admissions assistant with enquiry tracking, school administration (records, attendance, marks, report cards, reports, tasks), hostel management, coding/AI/robotics activities and a management command centre.

Served at **https://www.voxvision.site/mananvidyademo** as a separate Next.js zone (see `docs/15-deployment-and-maintenance.md`).

> Proprietary and confidential. © VoxVision. See `LICENSE`. This is a proposal: it has not been commissioned or endorsed by the school, and the presentation environment contains synthetic data only.

## Before presenting: action required

The fee line items supplied for the proposal total **₹3,35,000**, while the stated fee and payment milestones total **₹3,50,000**. No figure was changed. The proposal page and documents show a "₹15,000 not yet allocated" row. To reconcile it, edit `BUDGET_LINES` in `src/lib/commercial.ts` (the test in `tests/domain.test.ts` checks the totals and will need its expectation updated), update docs 01, 14 and 18, and rebuild.

## Quick start

```bash
npm install
cp .env.example .env.local        # presentation mode, embedded database
npm run dev                       # http://localhost:3210/mananvidyademo
```

AI is optional. Without a key, AI features show approved material or templates and say so. To switch AI on, set `GEMINI_API_KEY` (Google Gemini; free tier for sample data only) or `ANTHROPIC_API_KEY` (Claude) in `.env.local`, then restart.

Sign in from the login page with one click per role (presentation mode). Sample accounts use the password in `SEED_PASSWORD` (default shown on the login page).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Develop, build, run (port 3210) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | Unit and database tests (Vitest, embedded Postgres) |
| `npm run test:e2e` | End-to-end tests against the production build (needs `npm run build`; uses local Chrome/Edge for UI checks) |
| `npm run test:ai [url]` | Live check of every AI feature against a running server with an AI key (spends AI usage) |
| `npm run db:migrate` / `db:seed` / `db:reset` | Database tasks |
| `npm run user:create -- --email … --name … --role …` | Create an account from the command line |
| `npm run licenses` | Regenerate `THIRD_PARTY_LICENSES.md` |
| `npm run docs:tables` | Regenerate the permission and API tables in docs 05 and 06 |

## Documentation

`docs/` holds the full package (executive summary, feature catalogue, specifications, architecture, roles, database/API, AI approach, ERP requirements, privacy/security/child safety, testing, user manuals, schedule, training, commercial scope, deployment, presentation script, IP checklist, outstanding requirements). Client-facing documents are also viewable in the app at `/mananvidyademo/guide`; internal ones (04, 06, 15, 16, 17) are not served.

## Structure

```
src/app         pages and API routes (App Router, basePath /mananvidyademo)
src/components  shared UI
src/lib         domain logic, database, auth, RBAC, AI integration
scripts         e2e tests, DB CLI, doc and licence generators
tests           unit and database tests
deploy          main-site rewrite (patch and full file)
docs            documentation package
```
