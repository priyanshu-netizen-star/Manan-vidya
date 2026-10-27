# AI integration and content-management approach

## Principles

1. **Teachers own the content.** Students only see material and questions that a teacher (or management) has approved.
2. **AI drafts; people decide.** AI can draft lesson plans and questions, but every draft is saved as a draft and must be reviewed. AI never publishes anything to students and never makes decisions about a child.
3. **Grounded answers.** AI answers students' questions from the school's approved material for that topic, and admissions questions only from school-confirmed facts.
4. **Honest about AI.** If AI is not configured, unavailable, or declines a request, the screen says so and shows approved material instead. Nothing is presented as AI that is not.
5. **Child safety comes before AI.** Messages suggesting a child may be at risk are never sent to AI and never stored.
6. **Cost control.** AI is optional, has per-user hourly limits, and its usage is billed by the provider separately from the project fee.

## Where AI is used

| Feature | Who | Input sent to AI | Output | Review |
|---|---|---|---|---|
| Learning assistant | Student | Question; up to 3 passages of the topic's approved material; subject, topic, class | Explanation (under 250 words, same language as the question) | Labelled "AI explanation… can make mistakes: check with your teacher"; sources shown beneath |
| Lesson preparation | Teacher | Topic, class, length, focus; up to 6 passages of approved material | Draft lesson plan in Markdown | Saved as draft; teacher edits and marks *Reviewed* |
| Question drafting | Teacher | Topic, class, count, difficulty; approved material | Multiple-choice questions (4 options, answer, explanation, difficulty) | Each saved as draft marked "AI draft"; teacher approves individually |
| Admissions rewording | Parent (public) | Parent's question; matching verified knowledge-base entries | Conversational rewording, under 120 words | Must not add facts; sources and verification status always shown |

AI is **not** used for: marking quizzes, deciding admissions, approving leave, attendance, report cards, or any welfare matter.

## How it works without AI

| Feature | Without an AI key |
|---|---|
| Learning assistant | Shows the most relevant passages of approved material with the notice "AI service is not configured… these are the most relevant parts of the material your teacher approved." |
| Lesson preparation | Builds a structured template (objectives, timed sequence, differentiation, exit questions with answers from the question bank, homework), labelled "Template from approved material". |
| Question drafting | Reports "The AI service has not been configured for this deployment" and creates nothing. |
| Admissions assistant | Answers with the verified knowledge-base text (this is also the safest mode). |

## Model and configuration

- Providers: Anthropic Claude (official TypeScript SDK) or Google Gemini (REST API), selected with `AI_PROVIDER`. Both are called only from the server; prompts, limits and fallbacks are the same for both.
- Claude model: `claude-opus-5-5` by default (`AI_MODEL`). Server-side refusal fallback is enabled so that a request declined by one model's safety classifier can be retried by Anthropic's recommended fallback model.
- Gemini model: `gemini-2.5-flash` by default (`GEMINI_MODEL`); if it is busy or over its free-tier limit, the models in `GEMINI_FALLBACK_MODELS` are tried in order. Requests blocked by Gemini's safety filters are reported as declined, never shown as an answer.
- **Gemini free tier:** usable for presentations with sample data. Google's free-tier terms may allow it to use requests to improve its products and impose daily limits, so a paid plan (or Claude) is required before any real student or parent information is processed.
- Answer quality must be checked with teachers for whichever provider and model the school chooses.
- Effort: low for student answers and admissions rewording; medium for lesson plans and question drafting.
- Limits: `AI_HOURLY_LIMIT_PER_USER` (default 30 requests per user per hour); student questions also limited to 20 per 10 minutes.
- Question drafts use a validated JSON schema; anything not exactly 4 options with a valid answer index is discarded.

## Prompts (summary)

- **Learning assistant:** "Base your explanation on the teacher-approved sources… If the sources do not cover the question, say so plainly and suggest the student asks their teacher. Do not invent facts… guide them through the method rather than only stating the final answer… Stay on school learning topics… Never ask for or repeat personal information… Reply in the same language the student used."
- **Admissions:** "Using ONLY the facts provided… no fees, dates, guarantees, or policies that are not stated. If the facts do not fully answer the question… tell the parent that school staff will follow up."
- **Teacher tools:** "You produce a DRAFT that the teacher will review… End with a short 'Teacher to verify' list."

The full prompts are in `src/lib/ai.ts` and will be reviewed with the school during discovery.

## Content-management workflow

```
Teacher writes material ──▶ draft ──▶ teacher/management approves ──▶ visible to students
                                ▲                                         │
                                └───────────── any edit ◀─────────────────┘

Teacher writes question  ─┐
AI drafts questions ──────┴─▶ draft ──▶ approve (one by one) ──▶ usable in quizzes and worksheets
                                                              └▶ answered by students ⇒ locked against edits
```

- Every item records who created it, who approved it and when.
- Material history is shown on its page; all actions are in the audit log.
- Raw HTML in content is not rendered (it is shown as text), so authored content cannot run scripts.

## Admissions knowledge base

- Seeded with facts from the school's public website only (retrieved 27 October 2026), each with its source page, marked "From the school's public website (awaiting school confirmation)".
- Where the website contradicts itself (student–teacher ratio: 20:1 on the home page, 1:30 on the About page), the entry is **unpublished** until the school confirms.
- Fees, deadlines, hostel charges and transport routes are not on the website, so the assistant passes those questions to staff.
- Hindi text was drafted by VoxVision and must be reviewed by a fluent staff member before go-live (`hindi_reviewed`).
- Staff see every question the assistant could not answer, so they can add approved answers.

## Data sent to the AI provider

Only the question text and the approved content listed above. No student names, IDs, marks, attendance or contact details are sent. The school should review the provider's data-processing terms during discovery and decide whether to enable AI. Students are told on screen never to enter personal details.

## Quality assurance before go-live

1. Teachers test the learning assistant on each pilot topic with a set of typical and tricky questions; record unsuitable answers.
2. Adjust prompts or material, and re-test.
3. Confirm the safety screening with the school's safeguarding lead.
4. Measure monthly AI usage during the pilot to estimate running costs before wider roll-out.
