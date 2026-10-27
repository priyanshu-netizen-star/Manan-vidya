/** Coding / AI-literacy / robotics challenge helpers shared by pages and APIs. */

export const TRACKS = {
  python: { label: "Python programming", blurb: "Variables, loops, functions and lists, run directly in the browser." },
  web: { label: "Web development", blurb: "Build pages with HTML and make them interactive with JavaScript." },
  ai_literacy: { label: "AI literacy", blurb: "What AI is, how it learns, and how to use it safely and honestly." },
  robotics: { label: "Robotics and IoT", blurb: "Program a virtual robot and sensor logic before working with real kits." },
} as const;
export type Track = keyof typeof TRACKS;

export type McqSpec = { questions: { q: string; options: string[]; answer: number }[] };

/** Removes answers before a challenge is sent to the browser. */
export function publicSpec(kind: string, spec: unknown): unknown {
  if (kind !== "mcq") return spec;
  const s = spec as McqSpec;
  return { questions: s.questions.map(({ q, options }) => ({ q, options })) };
}

export function gradeMcq(spec: McqSpec, answers: (number | null)[]) {
  const results = spec.questions.map((q, i) => answers[i] === q.answer);
  return { correct: results.filter(Boolean).length, total: spec.questions.length, results, passed: results.every(Boolean) };
}
