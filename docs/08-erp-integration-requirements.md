# School ERP integration requirements

## Current position

- The school's public website links to an administrative login at `admin.mananvidya.com` and offers online registration and payments, which suggests existing school software is in use.
- VoxVision has **no access** to that software, its database or its vendor, and has not connected to it.
- **No integration is promised** until the software has been reviewed and compatibility (and the vendor's permission) has been established.

VoxVision School OS works on its own without any integration. Integration is about avoiding double entry where the school already keeps data elsewhere.

## Options, from simplest to most connected

| Option | How it works | Needs | Effort | Risk |
|---|---|---|---|---|
| 1. School OS as the system of record for the new modules | Learning, admissions enquiries, hostel and tasks live only in School OS; existing software continues for fees and anything else | Nothing from the vendor | Included | Lowest |
| 2. One-time import | Export students, classes and staff from the existing software (CSV/Excel) and import them into School OS at go-live | An export from the current software; a data-mapping session | Included for students, classes and staff (agreed volumes) | Low |
| 3. Scheduled file exchange | Regular export/import of agreed data (for example nightly student list) | Repeatable export from the vendor; secure transfer location | To be quoted after review | Medium |
| 4. API integration | Direct, automated exchange through the vendor's API | Vendor documentation, API credentials, written vendor and school approval, test environment | To be quoted after review; may involve vendor fees (excluded) | Higher |

## Discovery checklist (weeks 1–2)

1. Name and version of the current software; hosting (cloud or on-premises); vendor contact.
2. Which records it holds: students, guardians, classes, staff, attendance, marks, fees, transport, hostel.
3. Which system should be the "source of truth" for each record after go-live.
4. Export formats available (CSV/Excel), whether exports can be scheduled, and who can run them.
5. Whether an API exists; documentation; authentication method; rate limits; costs; terms of use.
6. Whether the vendor permits third-party integration, in writing.
7. Data-protection terms between the school and the vendor.
8. A test environment or anonymised sample export.

## Data mapping (for import)

| School OS field | Typical source | Notes |
|---|---|---|
| `students.admission_no` | Admission/registration number | Must be unique |
| `students.name`, `gender`, `date_of_birth` | Student master | |
| `students.class_id`, `roll_no` | Current class/section, roll | Classes created first |
| `students.guardian_name`, `guardian_phone` | Guardian details | Used for parent accounts |
| `students.is_boarder` | Boarding/day status | Drives hostel features |
| `users` (staff) | Staff list with role | Accounts created by the administrator |
| `teaching_assignments` | Timetable / subject allocation | Needed for teacher scope |

## Integration design rules (if options 3 or 4 are approved)

- Connectors run on the server; credentials are stored as server-side secrets, never in browser code.
- Least privilege: read only the agreed fields; write back only if explicitly approved.
- Every sync is logged (records read, created, updated, rejected) and visible to the administrator.
- Validation before import; rejected rows reported, never silently dropped.
- A tested rollback plan for each sync.

## Responsibilities

| Party | Responsibility |
|---|---|
| School | Provide software details, vendor contact and exports; obtain vendor permission; approve data mapping; authorise in writing |
| Vendor | Provide exports or API access per their terms (fees, if any, are excluded from the VoxVision fee) |
| VoxVision | Review, recommend an option, implement the approved option within the agreed scope, test with sample data, document |
