# Deployment and maintenance guide

*Internal document for VoxVision and the school's IT contact.*

## 1. How it is deployed

School OS is deployed as its own Next.js application (a "zone") and served under **https://www.voxvision.site/mananvidyademo** through a rewrite on the main VoxVision site:

```
Browser ─▶ www.voxvision.site/mananvidyademo/*  ─(rewrite)─▶  <SCHOOL_OS_ORIGIN>/mananvidyademo/*
Browser ─▶ www.voxvision.site/* (everything else) ─────────▶  existing VoxVision site (unchanged)
```

Why this design:
- The existing VoxVision website code is not modified apart from one rewrite rule, which does nothing unless `SCHOOL_OS_ORIGIN` is set.
- School OS secrets (database, AI key) live only in the School OS deployment.
- The School OS repository can remain private and separately access-controlled.

## 2. Prerequisites

| Item | Notes |
|---|---|
| Node.js 20.9+ (22 LTS recommended) | Build and runtime |
| Hosting for a Node.js Next.js app | Vercel (same as the main site) or any Node host (Render, Railway, a VM with `npm start`) |
| Managed PostgreSQL 14+ | Supabase, Neon, Amazon RDS, etc. Encryption at rest, TLS, daily backups with point-in-time recovery |
| Access to the main site's hosting project | To add `SCHOOL_OS_ORIGIN` and the rewrite rule |
| Anthropic API key (optional) | Only if the school approves AI features |

## 3. Environment variables (School OS)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `APP_ENV` | yes | `presentation` or `production` | `production` disables one-click sign-in, data reset and the presentation banner |
| `DATABASE_URL` | yes (hosted) | `postgres://…?sslmode=require` | Hosted database. If unset, an embedded database is used: **not for hosted deployments** |
| `ALLOWED_ORIGINS` | yes | `https://www.voxvision.site` | Browser origins allowed to make changes (CSRF protection) |
| `SEED_PASSWORD` | presentation only | a strong password | Password for sample accounts |
| `AI_PROVIDER` | optional | `anthropic` or `gemini` | AI provider. If unset, whichever key is set is used (Anthropic first) |
| `ANTHROPIC_API_KEY` | optional | `sk-ant-…` | Enables AI features with Claude (server-side only) |
| `AI_MODEL` | optional | `claude-opus-5-5` | Claude model |
| `GEMINI_API_KEY` | optional | from aistudio.google.com | Enables AI features with Google Gemini (server-side only). Free tier: sample data only |
| `GEMINI_MODEL` | optional | `gemini-2.5-flash` | Gemini model |
| `GEMINI_FALLBACK_MODELS` | optional | `gemini-flash-lite-latest,gemini-flash-latest` | Gemini models tried in order when the main one is busy or over its limit |
| `AI_HOURLY_LIMIT_PER_USER` | optional | `30` | AI requests per user per hour |
| `DB_POOL_MAX` | optional | `5` | Database connection pool size |
| `DB_SSL_NO_VERIFY` | optional | `true` only for a database with a private certificate authority | Turns off TLS certificate verification (on by default) |
| `COOKIE_SECURE` | optional | `false` only for local HTTP testing | Session cookie `Secure` flag (on by default in production) |

Never put secrets in client code, in the repository, or in documentation. Use the host's encrypted environment settings.

## 4. Deploy School OS (Vercel)

1. Create a **private** Git repository for School OS and push the code (`.env*` files are git-ignored).
2. In Vercel, create a new project from that repository (framework: Next.js; root: repository root).
3. Set the environment variables above for *Production*.
4. Deploy. Note the deployment origin, for example `https://voxvision-school-os.vercel.app`.
5. Check `https://voxvision-school-os.vercel.app/mananvidyademo` loads.
6. Initialise the database (runs automatically on first request). For production, run once from a trusted machine, using the **direct** (non-pooled) address:
   ```bash
   DATABASE_URL=<direct address> npm run db:migrate
   # presentation environment only (synthetic data):
   DATABASE_URL=<direct address> APP_ENV=presentation npm run db:seed
   ```

**Neon notes.** Set `DATABASE_URL` in Vercel to Neon's *pooled* address (host contains `-pooler`); use the direct address (without `-pooler`) for migrations and seeding. The app uses `pg` with Vercel's `attachDatabasePool`, so idle connections close before an instance is suspended. Keep Vercel's function region close to the Neon region (Neon `us-east-2` with Vercel `iad1`): seeding from India to a US database takes minutes, while the in-app reset on Vercel takes about 30 seconds.

**Current presentation deployment (27 October 2026):** Vercel project `nyay-saathis-projects/manan-vidya`, live at `https://manan-vidya.vercel.app/mananvidyademo`, database Neon (`us-east-2`), AI Google Gemini (free tier, sample data only). Deployed from the CLI; the Git repository is not yet connected.

Other Node hosts: `npm ci && npm run build && npm start` (port with `-p` or `PORT`), behind HTTPS.

## 5. Mount it on www.voxvision.site/mananvidyademo

On the **main VoxVision site** (repository `voxvision`, folder `voxvision-new` or whichever folder the Vercel project builds):

1. Apply `deploy/main-site/next.config.patch` (or copy `deploy/main-site/next.config.ts`). It adds only:
   ```ts
   async rewrites() {
     if (!SCHOOL_OS_ORIGIN) return [];
     return [
       { source: "/mananvidyademo", destination: `${SCHOOL_OS_ORIGIN}/mananvidyademo` },
       { source: "/mananvidyademo/:path*", destination: `${SCHOOL_OS_ORIGIN}/mananvidyademo/:path*` },
     ];
   }
   ```
2. In the main site's Vercel project, set `SCHOOL_OS_ORIGIN=https://voxvision-school-os.vercel.app` and redeploy.
3. In School OS, make sure `ALLOWED_ORIGINS=https://www.voxvision.site` and redeploy if changed.
4. Verify (see section 7).

To remove School OS from the main site, delete `SCHOOL_OS_ORIGIN` and redeploy; the rewrite disappears.

## 6. Local development

```bash
npm install
cp .env.example .env.local      # APP_ENV=presentation, no DATABASE_URL → embedded database in .data/
npm run dev                     # http://localhost:3210/mananvidyademo
npm run db:reset                # wipe and reload synthetic data (embedded or DATABASE_URL)
```

## 7. Verification after each deployment

```bash
npm run typecheck && npm run lint && npm test     # unit and database tests
npm run build && npm run test:e2e                 # end-to-end against the production build
```

Then on the live address:
- `https://www.voxvision.site/` and other existing pages load as before.
- `https://www.voxvision.site/mananvidyademo` shows the proposal; refresh any deep link (for example `/mananvidyademo/app/learn`) after signing in.
- Sign in, change something (for example add a task) and sign out. A 403 "Cross-origin request blocked" means `ALLOWED_ORIGINS` is wrong.
- System & AI status page shows the expected environment, database and AI state.

## 8. Going live with real school data (checklist)

1. Written agreement and data-protection plan approved (see *Privacy, security and child safety*).
2. `APP_ENV=production`, hosted `DATABASE_URL`, `ALLOWED_ORIGINS` set.
3. Fresh production database: run `npm run db:migrate` only (no seed).
4. Create the first platform administrator account:
   ```bash
   DATABASE_URL=… npm run user:create -- --email admin@school.example --name "School Administrator" --role platform_admin
   ```
   (prompts for a password; minimum policy applies)
5. Configure classes, subjects, teaching assignments, students (import), staff accounts.
6. Knowledge base: only school-confirmed answers published; Hindi reviewed.
7. Grade scale confirmed; safeguarding messages confirmed.
8. Backups enabled and a restore tested.
9. System & AI status checklist all green.

## 9. Maintenance

| Task | Frequency | How |
|---|---|---|
| Check backups and test a restore | Monthly; restore test each term | Database provider console |
| Dependency and security updates | Monthly; critical promptly | `npm outdated`, update, run all tests, deploy |
| Review user accounts; deactivate leavers | Each term / on leaving | Users & roles |
| Review audit log for unusual activity (exports, unlocks, failed sign-ins) | Monthly | Audit log |
| Review AI usage and costs | Monthly (if enabled) | Anthropic console |
| Review assistant questions passed to staff | Weekly | Assistant knowledge base |
| Archive old enquiries per retention policy | Termly | SQL script agreed with the school |
| New academic year: create classes, promote students, assign teachers | Annually | Office and administrator |

## 10. Operations notes

- **Rate limiting** is in-memory per server instance. If the host runs several instances, add a shared store (for example Redis) before relying on limits for abuse prevention.
- **Embedded database** (PGlite) is single-process and for local use and tests only. Hosted deployments must use `DATABASE_URL`.
- **Logs**: the host's function logs contain error details (not shown to users). Keep log retention short and restrict access.
- **Python lessons** load Pyodide from `cdn.jsdelivr.net` in the student's browser; school networks must allow that domain.
- **Time zone**: all dates use India Standard Time regardless of server location.

## 11. Rollback

- Application: redeploy the previous build in the host's dashboard.
- Main site: remove `SCHOOL_OS_ORIGIN` to detach School OS instantly.
- Database: restore from point-in-time backup to a new database, verify, then switch `DATABASE_URL`.
