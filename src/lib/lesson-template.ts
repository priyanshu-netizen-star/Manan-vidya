import type { Passage } from "./text";

/**
 * Non-AI lesson-plan scaffold built only from the school's approved material and question bank.
 * Used when the AI service is not configured. It is labelled as a template in the UI.
 */
export function lessonTemplate(input: {
  subject: string;
  topic: string;
  className: string;
  minutes: number;
  focus: string;
  passages: Passage[];
  questions: { prompt: string; options: string[]; correct_index: number }[];
}) {
  const firstSentence = (t: string) => (t.match(/^[^.!?]+[.!?]/)?.[0] ?? t).trim();
  const keyPoints = input.passages.map((p) => `- ${firstSentence(p.text)}`).join("\n") || "- (Add the key points for this lesson.)";
  const m = input.minutes;
  const slot = (share: number) => Math.max(3, Math.round(m * share));
  const exit = input.questions
    .slice(0, 3)
    .map((q, i) => `${i + 1}. ${q.prompt}\n   Answer: ${q.options[q.correct_index]}`)
    .join("\n");
  return `# ${input.topic}: lesson plan (${input.className}, ${m} minutes)

> Template generated from the school's approved material. Review and adapt it before teaching.

## Learning objectives
By the end of the lesson students will be able to:
- explain the main ideas of "${input.topic}" in their own words;
- solve or answer typical questions on the topic;
- identify and correct a common mistake.
${input.focus ? `\nTeacher's focus: ${input.focus}\n` : ""}
## Key content (from approved material)
${keyPoints}

## Lesson sequence
| Time | Activity |
| --- | --- |
| ${slot(0.1)} min | Starter: quick recall question linked to the previous lesson |
| ${slot(0.3)} min | Teach the key content above with one worked example on the board |
| ${slot(0.3)} min | Guided practice in pairs; circulate and check understanding |
| ${slot(0.2)} min | Independent practice (worksheet or practice quiz in School OS) |
| ${slot(0.1)} min | Exit check and summary |

## Differentiation
- **Support:** give a worked example to follow step by step; pair with a confident peer.
- **Stretch:** ask students to create their own question on the topic and explain the answer.

## Exit check
${exit || "(Add approved questions for this topic to the question bank to fill this section.)"}

## Homework
Take the practice quiz for "${input.topic}" in School OS and read the explanations for any question answered incorrectly.

## Teacher to verify
- Timings suit the class.
- Examples match the textbook used by the school.
`;
}
