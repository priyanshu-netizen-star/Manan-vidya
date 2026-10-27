import { Field } from "@/components/ui";

/** Shared fields for creating and editing a multiple-choice question (server-rendered inside a JsonForm). */
export function QuestionFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults?: { prompt: string; options: string[]; correct_index: number; explanation: string; difficulty: string };
}) {
  return (
    <>
      <Field label="Question" htmlFor={`${idPrefix}-prompt`}>
        <textarea id={`${idPrefix}-prompt`} name="prompt" className="textarea" rows={2} required minLength={5} maxLength={600} defaultValue={defaults?.prompt} />
      </Field>
      <fieldset>
        <legend className="label">Options (select the correct one)</legend>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctIndex"
                value={i}
                defaultChecked={(defaults?.correct_index ?? 0) === i}
                aria-label={`Option ${i + 1} is correct`}
                className="accent-[#6c5ce7]"
                required
              />
              <input name="options" className="input" placeholder={`Option ${i + 1}`} required maxLength={200} defaultValue={defaults?.options[i]} aria-label={`Option ${i + 1}`} />
            </div>
          ))}
        </div>
      </fieldset>
      <Field label="Explanation shown after the quiz" htmlFor={`${idPrefix}-exp`}>
        <textarea id={`${idPrefix}-exp`} name="explanation" className="textarea" rows={2} required minLength={5} maxLength={1000} defaultValue={defaults?.explanation} />
      </Field>
      <Field label="Difficulty" htmlFor={`${idPrefix}-diff`}>
        <select id={`${idPrefix}-diff`} name="difficulty" className="select" defaultValue={defaults?.difficulty ?? "medium"}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </Field>
    </>
  );
}
