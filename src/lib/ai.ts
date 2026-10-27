import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SCHOOL, aiConfigured, aiModel, aiProvider, geminiFallbackModels } from "./config";
import { rateLimit } from "./ratelimit";
import type { Passage } from "./text";
import type { KbEntry } from "./kb";

/**
 * Server-side AI integration (Anthropic Claude, or Google Gemini via AI_PROVIDER). The API key never leaves the server.
 * Every AI output is either grounded in school-approved material or saved as a draft
 * that a teacher must review. When no key is configured, callers receive AiUnavailable
 * and fall back to clearly labelled non-AI behaviour.
 */

export class AiUnavailable extends Error {
  constructor(public reason: "not_configured" | "rate_limited" | "refused" | "provider_error", message: string) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient() {
  if (!aiConfigured()) throw new AiUnavailable("not_configured", "The AI service has not been configured for this deployment.");
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

function checkQuota(userKey: string) {
  const perHour = Number(process.env.AI_HOURLY_LIMIT_PER_USER || 30);
  if (!rateLimit(`ai:${userKey}`, perHour, 3600)) {
    throw new AiUnavailable("rate_limited", "The hourly AI usage limit for this account has been reached. Please try again later.");
  }
}

const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const GEMINI_BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

/** Google Gemini via its REST API (no extra dependency). Returns the answer text, or JSON text when a schema is given. */
async function geminiGenerate(opts: { system: string; prompt: string; maxTokens: number; jsonSchema?: object }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiUnavailable("not_configured", "The AI service has not been configured for this deployment.");
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      maxOutputTokens: opts.maxTokens,
      ...(opts.jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: opts.jsonSchema } : {}),
    },
  });
  // Free-tier capacity varies by model, so a busy or rate-limited model falls through to the next one.
  const models = [aiModel(), ...geminiFallbackModels().filter((m) => m !== aiModel())];
  let res: Response | null = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body,
          signal: AbortSignal.timeout(60_000),
        });
      } catch (e) {
        console.error(`[ai] Gemini request to ${model} failed`, e);
        res = null;
      }
      if (res && res.status !== 500 && res.status !== 503) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (res && res.status !== 429 && res.status !== 500 && res.status !== 503 && res.status !== 404) break;
    if (res) console.error(`[ai] Gemini ${model} returned ${res.status}; trying the next model`);
  }
  if (!res) throw new AiUnavailable("provider_error", "The AI service is temporarily unavailable.");
  if (res.status === 429) throw new AiUnavailable("rate_limited", "The AI service is busy or its free usage limit has been reached. Please try again later.");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403 || /API_KEY_INVALID/.test(detail)) {
      console.error("[ai] authentication failed: check GEMINI_API_KEY");
      throw new AiUnavailable("not_configured", "The AI service credentials are not valid for this deployment.");
    }
    console.error(`[ai] Gemini API error ${res.status}`, detail.slice(0, 500));
    throw new AiUnavailable("provider_error", "The AI service is temporarily unavailable.");
  }
  const data = (await res.json()) as {
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const cand = data.candidates?.[0];
  if (data.promptFeedback?.blockReason || (cand?.finishReason && GEMINI_BLOCKED.has(cand.finishReason))) {
    throw new AiUnavailable("refused", "The AI service declined this request. Please rephrase it or ask a teacher.");
  }
  return (cand?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

async function complete(opts: {
  userKey: string;
  system: string;
  prompt: string;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<string> {
  checkQuota(opts.userKey);
  if (aiProvider() === "gemini") {
    const text = await geminiGenerate({ system: opts.system, prompt: opts.prompt, maxTokens: opts.maxTokens ?? 4000 });
    if (!text.trim()) throw new AiUnavailable("provider_error", "The AI service returned an empty answer.");
    return text.trim();
  }
  const anthropic = getClient();
  try {
    const res = await anthropic.beta.messages.create({
      model: aiModel(),
      max_tokens: opts.maxTokens ?? 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: opts.effort },
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    if (res.stop_reason === "refusal") {
      throw new AiUnavailable("refused", "The AI service declined this request. Please rephrase it or ask a teacher.");
    }
    const text = res.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
    if (!text) throw new AiUnavailable("provider_error", "The AI service returned an empty answer.");
    return text;
  } catch (e) {
    throw toUnavailable(e);
  }
}

function toUnavailable(e: unknown): AiUnavailable {
  if (e instanceof AiUnavailable) return e;
  if (e instanceof Anthropic.RateLimitError) return new AiUnavailable("rate_limited", "The AI service is busy. Please try again shortly.");
  if (e instanceof Anthropic.AuthenticationError) {
    console.error("[ai] authentication failed: check ANTHROPIC_API_KEY");
    return new AiUnavailable("not_configured", "The AI service credentials are not valid for this deployment.");
  }
  if (e instanceof Anthropic.APIError) {
    console.error(`[ai] API error ${e.status}`, e.message);
    return new AiUnavailable("provider_error", "The AI service is temporarily unavailable.");
  }
  console.error("[ai] unexpected error", e);
  return new AiUnavailable("provider_error", "The AI service is temporarily unavailable.");
}

const SCHOOL_CONTEXT = `You work inside VoxVision School OS, a school software platform proposed for ${SCHOOL.name}, a CBSE co-educational residential school in ${SCHOOL.city}, India.
VoxVision is the software vendor, not the school: when you refer to the school, call it "${SCHOOL.name}" or "the school". Mention the school or VoxVision only when the answer needs it.`;

function formatPassages(passages: Passage[]) {
  return passages.map((p, i) => `<source id="${i + 1}" title="${p.title}">\n${p.text}\n</source>`).join("\n");
}

// ─── Student tutor ──────────────────────────────────────────────────────────

export async function askTutor(input: {
  userKey: string;
  question: string;
  subject: string;
  topic: string;
  classLevel: number;
  passages: Passage[];
}) {
  const system = `${SCHOOL_CONTEXT}
You are a patient learning assistant for a Class ${input.classLevel} student studying ${input.subject}: "${input.topic}".
Rules:
- Base your explanation on the teacher-approved sources provided. If the sources do not cover the question, say so plainly and suggest the student asks their teacher. Do not invent facts.
- Explain step by step in simple language suitable for the student's age. Use a short worked example where it helps.
- Help the student understand; for homework-style questions guide them through the method rather than only stating the final answer.
- Stay on school learning topics. Politely decline anything unrelated, unsafe or personal, and suggest talking to a teacher or parent.
- Never ask for or repeat personal information.
- Reply in the same language the student used (English or Hindi). Keep it under 250 words.`;
  const prompt = `Teacher-approved sources:\n${formatPassages(input.passages) || "(no matching sources found)"}\n\nStudent's question:\n${input.question}`;
  return complete({ userKey: input.userKey, system, prompt, effort: "low", maxTokens: 2000 });
}

// ─── Teacher tools ──────────────────────────────────────────────────────────

export async function draftLessonPlan(input: {
  userKey: string;
  subject: string;
  topic: string;
  classLevel: number;
  minutes: number;
  focus: string;
  passages: Passage[];
}) {
  const system = `${SCHOOL_CONTEXT}
You help teachers prepare lessons. You produce a DRAFT that the teacher will review and edit; do not present it as final.
Write in clear, practical English using Markdown headings and bullet points.`;
  const prompt = `Prepare a ${input.minutes}-minute lesson plan for Class ${input.classLevel} ${input.subject}, topic "${input.topic}".
${input.focus ? `Teacher's focus: ${input.focus}\n` : ""}Use the school's approved material below as the content source:
${formatPassages(input.passages) || "(no approved material yet: keep content general and flag what the teacher must supply)"}

Include: learning objectives; prior knowledge check; a timed sequence of activities; one worked example; differentiation (support and stretch); a 3-question exit check with answers; and homework. End with a short "Teacher to verify" list of anything that needs checking.`;
  return complete({ userKey: input.userKey, system, prompt, effort: "medium", maxTokens: 6000 });
}

const DraftQuestions = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        options: z.array(z.string()),
        correct_index: z.number().int(),
        explanation: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
      }),
    )
    .min(1),
});
export type DraftQuestion = z.infer<typeof DraftQuestions>["questions"][number];

export async function draftQuestions(input: {
  userKey: string;
  subject: string;
  topic: string;
  classLevel: number;
  count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  passages: Passage[];
}): Promise<DraftQuestion[]> {
  checkQuota(input.userKey);
  const system = `${SCHOOL_CONTEXT}
You draft multiple-choice questions for teacher review. Every question must be answerable from the approved material provided.
Each question has exactly 4 options, one unambiguously correct answer (correct_index is 0-based), and an explanation a student can learn from.`;
  const prompt = `Draft ${input.count} multiple-choice questions for Class ${input.classLevel} ${input.subject}, topic "${input.topic}", difficulty: ${input.difficulty}.
Approved material:
${formatPassages(input.passages) || "(none)"}`;

  let parsed: z.infer<typeof DraftQuestions> | null = null;
  if (aiProvider() === "gemini") {
    const text = await geminiGenerate({ system, prompt, maxTokens: 8000, jsonSchema: z.toJSONSchema(DraftQuestions) });
    try {
      parsed = DraftQuestions.parse(JSON.parse(text));
    } catch {
      throw new AiUnavailable("provider_error", "The AI service returned an unreadable draft.");
    }
  } else {
    const anthropic = getClient();
    try {
      const res = await anthropic.beta.messages.parse({
        model: aiModel(),
        max_tokens: 8000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(DraftQuestions) },
        system,
        messages: [{ role: "user", content: prompt }],
      });
      if (res.stop_reason === "refusal") throw new AiUnavailable("refused", "The AI service declined this request.");
      parsed = res.parsed_output;
    } catch (e) {
      throw toUnavailable(e);
    }
  }
  if (!parsed) throw new AiUnavailable("provider_error", "The AI service returned an unreadable draft.");
  // Defensive validation: drop anything that is not a well-formed 4-option question.
  return parsed.questions
    .filter((q) => q.options.length === 4 && q.correct_index >= 0 && q.correct_index < 4 && q.prompt.trim())
    .slice(0, input.count);
}

// ─── Admissions assistant ───────────────────────────────────────────────────

/** Rephrases verified knowledge-base answers conversationally. It may not add facts. */
export async function phraseAdmissionsAnswer(input: { userKey: string; question: string; lang: "en" | "hi"; entries: KbEntry[] }) {
  const facts = input.entries
    .map((e, i) => `<fact id="${i + 1}">\nQ: ${e.question_en}\nA: ${e.answer_en}${e.answer_hi ? `\nA (Hindi): ${e.answer_hi}` : ""}\n</fact>`)
    .join("\n");
  const system = `${SCHOOL_CONTEXT}
You answer a parent's admissions question for the school, using ONLY the facts provided. Do not add any information that is not in the facts: no fees, dates, guarantees, or policies that are not stated.
If the facts do not fully answer the question, say what you can and tell the parent that school staff will follow up.
Reply in ${input.lang === "hi" ? "Hindi (Devanagari script)" : "English"}, warmly and in under 120 words.`;
  return complete({ userKey: input.userKey, system, prompt: `Facts:\n${facts}\n\nParent's question: ${input.question}`, effort: "low", maxTokens: 1500 });
}
