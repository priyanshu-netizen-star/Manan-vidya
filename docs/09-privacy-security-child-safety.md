# Privacy, security and child-safety plan

## 1. Roles and law

- The **school** decides why and how student, parent and staff data is used. Under India's **Digital Personal Data Protection Act, 2023 (DPDP Act)** it is the *Data Fiduciary*.
- **VoxVision** builds and (if agreed) operates the system on the school's instructions, as a *Data Processor*, under a written agreement.
- Children's data (under 18) needs **verifiable consent of a parent or guardian**, and must not be used for tracking, behavioural monitoring or targeted advertising. The system does none of these.
- The final data-protection plan is agreed with the school during discovery and must be approved **before any real data is entered**. Legal advice should be taken by the school as needed; this document is a technical and operational plan, not legal advice.

## 2. Current state: presentation environment

- Contains **only synthetic records** (flagged `seeded`); sample accounts use the reserved `.example` domain.
- Not connected to any school system.
- The public admissions page states that enquiries do not reach the school and asks visitors to use sample details only.
- All pages are excluded from search engines (`noindex`).

## 3. Data minimisation

| Data | Why it is needed | Who can see it |
|---|---|---|
| Student name, admission no., class, roll, gender, date of birth, guardian name and phone, boarder status | Records, attendance, report cards, hostel | Staff with `students.read`; the student/parent (own record) |
| Attendance, marks | Registers and report cards | Teachers (own classes/subjects), office, management; parent (final report cards) |
| Quiz attempts, learning events, questions asked (first 300 characters) | Progress and teacher feedback | Student, parent, teachers, management |
| Enquiry details (parent and child name, phone, optional email, class sought, message) | Responding to the enquiry | Office, management |
| Assistant questions (no identity) | Improving answers | Office |
| Hostel requests, roll-call, maintenance | Hostel operations | Warden, management; parent/student (own) |
| Account details, sessions, audit log | Security and accountability | Administrator; management (audit) |

Not collected: Aadhaar numbers, photographs, health records, religion or caste, biometric data, precise location. Admission documents remain with the school office.

## 4. Consent and notices

- Enquiry form: explicit consent checkbox; purpose stated.
- Privacy notice at `/mananvidyademo/privacy`, to be finalised with the school.
- Before go-live: the school collects parental consent for children's accounts and data (paper or digital), with a plain-language explanation of AI features if enabled.
- Parents can ask the school to access, correct or erase their child's data; the administrator can update or deactivate records.

## 5. Retention (proposed; the school decides)

| Data | Proposed retention |
|---|---|
| Enquiries not converted to admission | 12 months after closure, then deleted |
| Assistant question logs | 12 months |
| Learning events and quiz attempts | Duration of enrolment + 1 year |
| Attendance, marks, report cards | As required by school and board record-keeping rules |
| Audit log | 3 years |
| Sessions | 12 hours (expired sessions are invalid immediately) |

## 6. Security controls (implemented)

| Area | Control |
|---|---|
| Authentication | Individual accounts; scrypt password hashing with salt; minimum password policy; 5-failure lockout for 15 minutes; generic error messages; timing-equalised checks |
| Sessions | Random 256-bit tokens; only hashes stored; HttpOnly, SameSite=Lax, path-scoped cookie; Secure in production; 12-hour expiry; revoked on sign-out, role change, password reset and deactivation |
| Authorisation | Server-side permission checks on every page and API; data-scope checks (own class, own subject, own child) |
| CSRF | Origin verification on all state-changing requests |
| Input/output | Schema validation, body-size limit, parameterised SQL, HTML-escaping Markdown renderer, safe link schemes, CSV formula protection |
| Abuse prevention | Rate limits on sign-in, assistant, enquiries, tracking, AI and quiz submission; honeypot on the public form |
| Browser hardening | X-Frame-Options DENY, nosniff, strict referrer policy, permissions policy, COOP; no server banner; no production source maps |
| Secrets | Server-side environment variables only; `.env*` files excluded from the repository |
| Code execution | Student code runs only in the student's browser (web worker or sandboxed frame), never on the server |
| Accountability | Audit log of sign-ins, changes, decisions and exports; status history for every workflow; personal values not copied into logs |
| Errors | Users see generic messages; details only in server logs |

## 7. Operational security (before and after go-live)

- Hosted PostgreSQL with encryption at rest, TLS connections, automated daily backups and point-in-time recovery; restore tested before go-live and each term.
- Production environment (`APP_ENV=production`) disables one-click sign-in, the reset function and the presentation banner.
- Remove all synthetic records and sample accounts before real data is loaded.
- Least-privilege accounts; review user list each term; deactivate leavers the same day.
- Dependency updates and security patches monthly during support; critical patches promptly.
- A shared rate-limit store if more than one server instance is used.
- Incident response: contain, assess, notify the school immediately, and support the school's notification duties under the DPDP Act (the Data Protection Board and affected people), restore from backup if needed, and review.

## 8. Child-safety plan

| Risk | Control |
|---|---|
| A student discloses harm, abuse, bullying or distress to the assistant | Fixed safety message directing the student to a trusted adult (teacher, class teacher, warden, parent) and CHILDLINE 1098; the message is not sent to AI and not stored. **The school's safeguarding lead must confirm the wording, the contacts, and whether staff should be alerted (an alert workflow can be added once the school defines its safeguarding procedure).** |
| Inappropriate or inaccurate AI output | AI explains only from approved material; age-appropriate instructions; refusal handling; label "AI can make mistakes: check with your teacher"; teachers test before roll-out |
| Students sharing personal information | Questions containing phone numbers or emails are refused with a privacy reminder; AI-literacy lessons teach privacy |
| Contact between strangers and students | No messaging between users; no public profiles; no student-generated content visible to others |
| Missing boarder | Roll-call highlights absentees and reminds the warden to follow the school's missing-student procedure |
| Unsupervised leave | Leave needs warden approval; escort recorded; check-out and return recorded with time and staff name |
| Automated judgements about children | None: mastery bands and "may need support" lists are labelled as prompts for conversation; no automated decisions on admission, discipline or welfare |

## 9. Requirements before real data is used

1. Signed agreement including data-processing terms.
2. School-approved privacy notice, consent process and retention schedule.
3. Production hosting and database configured; backups verified.
4. `APP_ENV=production`; synthetic data and sample accounts removed.
5. Safeguarding lead approves the child-safety messages and procedure.
6. Admissions content confirmed by the school; Hindi reviewed.
7. Staff accounts created and trained; administrator nominated.
8. AI provider terms reviewed and AI enabled only if the school decides to.
