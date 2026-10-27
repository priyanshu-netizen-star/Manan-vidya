# Intellectual property and repository protection checklist

*Internal document for VoxVision.*

Browser-delivered code (HTML, CSS and client JavaScript) can always be inspected by anyone who loads the page; it cannot be made impossible to copy. Protection therefore focuses on the private repository, the server, credentials and contractual terms.

## Repository

- [ ] Repository is **private**; access limited to named VoxVision collaborators with individual accounts.
- [ ] Two-factor authentication required for all collaborators.
- [ ] Branch protection on the main branch (reviews required, no force-push).
- [ ] Secret scanning and push protection enabled.
- [ ] No `.env` files, keys, database dumps or real data committed (`.gitignore` covers `.env*`, `.data/`).
- [ ] Collaborators removed promptly when they leave; access reviewed quarterly.
- [ ] Contributor / employment agreements assign IP to VoxVision.

## Server-side protection (implemented)

- [x] Business logic that matters runs on the server: quiz scoring, permissions, workflows, assistant decisions, AI prompts, reports.
- [x] AI keys, database credentials and configuration are server-side environment variables only.
- [x] Correct answers and AI-literacy answers are never sent to the browser before grading.
- [x] Production source maps disabled (`productionBrowserSourceMaps: false`); no `X-Powered-By` header.
- [x] Error responses are generic; stack traces only in server logs.
- [x] Internal documents (architecture, database/API, deployment, presenter script, this checklist) are **not** served by the application's documentation viewer.
- [x] Public endpoints reviewed for leakage: assistant returns only published entries; enquiry tracking requires reference and phone and omits staff notes; reset and one-click sign-in disabled in production.

## Deployment

- [ ] Hosting accounts owned by VoxVision (or by the school, if agreed), with two-factor authentication.
- [ ] Separate environments (presentation and production) with separate databases and keys.
- [ ] Keys rotated on handover and whenever a collaborator leaves.

## Notices and licences

- [x] Proprietary licence notice (`LICENSE`) and `"license": "UNLICENSED"` in `package.json`.
- [x] Copyright line in the application footer: "© VoxVision. All rights reserved."
- [x] Third-party licences listed in `THIRD_PARTY_LICENSES.md` (generated with `npm run licenses`).
- [ ] Contract defines the school's rights (licence or ownership transfer), confidentiality and permitted use.

## Third-party content

- [x] No school source code or private assets used. School facts come only from its public website, cited with source pages.
- [x] Learning material and questions are original text written by VoxVision; teachers will review and may replace them.
- [x] VoxVision logo used; no school logo used without permission.
- [ ] If the school provides its logo or content, obtain written permission and record it.
