# Outstanding requirements and dependencies

What is still needed before VoxVision School OS can be used operationally with real school information. Items marked **School** need the school's decision, information or authorisation; **VoxVision** items are VoxVision's responsibility; **Third party** items need an outside provider.

## Before the agreement

| # | Item | Owner |
|---|---|---|
| 1 | Reconcile the fee breakdown: line items total ₹3,35,000 against the ₹3,50,000 fee | VoxVision |
| 2 | Agree final scope, acceptance criteria, support period and source-code licensing or ownership | School and VoxVision |
| 3 | Data-processing terms (school as Data Fiduciary, VoxVision as Data Processor) | School and VoxVision |

## Before real data is entered

| # | Item | Owner |
|---|---|---|
| 4 | Written authorisation to collect and store student, parent and staff data | School |
| 5 | Approved privacy notice, parental consent process and retention schedule (DPDP Act, 2023) | School (VoxVision supports) |
| 6 | Production hosting and managed PostgreSQL with backups; restore tested | VoxVision; costs per *Commercial scope* |
| 7 | `APP_ENV=production`; synthetic records and sample accounts removed | VoxVision |
| 8 | Safeguarding lead approves child-safety wording, contacts and whether staff alerts are needed | School |
| 9 | Nominated platform administrator at the school | School |

## Module-specific

| # | Module | Item | Owner |
|---|---|---|---|
| 10 | Admissions | Confirm every knowledge-base answer; resolve the conflicting student–teacher ratio (20:1 vs 1:30 on the website) | School |
| 11 | Admissions | Review all Hindi text by a fluent staff member | School |
| 12 | Admissions | Decide whether fee information may be published by the assistant | School |
| 13 | Admissions | Authorise collection of real enquiries on the public page; decide the public address | School |
| 14 | Admissions | (Optional) SMS/WhatsApp confirmations: provider account and charges | School / Third party |
| 15 | Learning | Select pilot classes and subjects; teachers approve or replace sample material and questions | School |
| 16 | Learning | Decide whether to enable AI; create the AI provider account; review provider terms; budget for usage | School / Third party |
| 17 | Learning | Teachers test AI answers on pilot topics before student use | School and VoxVision |
| 18 | Administration | Details of the current school software, vendor contact and exports; vendor permission for any integration | School / Third party |
| 19 | Administration | Confirm grade scale, exam structure and report-card layout | School |
| 20 | Administration | Student, class, staff and teaching-assignment data (import file) | School |
| 21 | Hostel | Room and bed list, boarder list, leave policy, missing-student procedure | School |
| 22 | Coding and robotics | Decide on robotics kits and workshops (separately priced); allow `cdn.jsdelivr.net` on the school network for Python lessons | School |
| 23 | All | Staff named for each role; training schedule | School |

## Technical items for scale-up (VoxVision)

| # | Item | When |
|---|---|---|
| 24 | Shared rate-limit store if more than one server instance is used | Before production if the host scales horizontally |
| 25 | Automated retention clean-up jobs per the agreed schedule | Before the first retention deadline |
| 26 | Parent accounts for multiple children (one parent, several students) | If required in discovery |
| 27 | Staff alert workflow for safeguarding messages | Only if the school's procedure requires it |
| 28 | Bulk import tool for students and staff | During administration phase (weeks 6–8) |

## Dependencies on third parties

| Dependency | Used for | Status |
|---|---|---|
| Anthropic Claude API | AI explanations, drafts, rewording | Integrated in code; **not configured** in the presentation environment |
| Google Gemini API (alternative) | Same as above | Integrated in code; a free-tier key is used locally for presentations with sample data only. A paid plan (or Claude) is required before real data is processed |
| PostgreSQL provider | Data storage | Embedded database used locally; hosted provider to be chosen |
| Hosting provider (e.g. Vercel) | Running the application | To be set up; deployment configuration prepared |
| cdn.jsdelivr.net (Pyodide) | Python lessons in the browser | Used directly by the student's browser |
| School ERP vendor | Optional integration | Not contacted; requires school introduction and permission |
| SMS/WhatsApp provider | Optional notifications | Not included |
