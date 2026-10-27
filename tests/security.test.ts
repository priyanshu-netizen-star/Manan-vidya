import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/components/Markdown";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { toCsv } from "@/lib/reports";
import { publicSpec, gradeMcq, type McqSpec } from "@/lib/coding";
import { parseRobotProgram } from "@/lib/robot";
import { lessonTemplate } from "@/lib/lesson-template";

describe("markdown rendering of teacher-authored content", () => {
  it("escapes raw HTML and script tags", () => {
    const html = renderMarkdown('Hello <script>alert(1)</script> <img src=x onerror="alert(2)">');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&lt;script&gt;");
  });
  it("drops javascript: links but keeps safe links", () => {
    const html = renderMarkdown("[bad](javascript:alert(1)) [good](https://www.mananvidya.com)");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://www.mananvidya.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("does not render images (no tracking pixels)", () => {
    expect(renderMarkdown("![pixel](https://evil.example/p.png)")).not.toMatch(/<img/);
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas", () => {
    const csv = toCsv({ title: "", description: "", head: ["Name"], rows: [["=HYPERLINK(\"http://x\")"], ["+1"], ["-2"], ["@cmd"]] });
    for (const line of csv.trim().split("\r\n").slice(1)) expect(line.replace(/^"/, "").startsWith("'")).toBe(true);
  });
  it("keeps negative numbers as numbers", () => {
    expect(toCsv({ title: "", description: "", head: ["n"], rows: [[-5]] })).toContain("\r\n-5\r\n");
  });
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv({ title: "", description: "", head: ["a"], rows: [['He said "hi", then\nleft']] })).toContain('"He said ""hi"", then\nleft"');
  });
});

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("Correct-horse-42");
    const b = await hashPassword("Correct-horse-42");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$16384$")).toBe(true);
    expect(await verifyPassword("Correct-horse-42", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
  it("enforces the minimum policy", () => {
    expect(passwordProblem("short1")).not.toBeNull();
    expect(passwordProblem("onlyletterslong")).not.toBeNull();
    expect(passwordProblem("letters-and-123")).toBeNull();
  });
});

describe("AI-literacy checks", () => {
  const spec: McqSpec = { questions: [{ q: "Q1", options: ["a", "b"], answer: 1 }, { q: "Q2", options: ["a", "b"], answer: 0 }] };
  it("never sends answers to the browser", () => {
    expect(JSON.stringify(publicSpec("mcq", spec))).not.toContain("answer");
  });
  it("grades on the server", () => {
    expect(gradeMcq(spec, [1, 0])).toMatchObject({ correct: 2, passed: true });
    expect(gradeMcq(spec, [1, null])).toMatchObject({ correct: 1, passed: false });
  });
});

describe("robot program limits", () => {
  it("rejects runaway repeat counts and distances", () => {
    expect(() => parseRobotProgram("repeat 1000 { forward }")).toThrow();
    expect(() => parseRobotProgram("forward 500")).toThrow();
  });
});

describe("lesson template without AI", () => {
  it("is built only from supplied approved content and marked as a template", () => {
    const md = lessonTemplate({
      subject: "Science", topic: "Force", className: "Class VIII", minutes: 40, focus: "",
      passages: [{ materialId: 1, title: "t", text: "A force is a push or a pull. More text.", score: 1 }],
      questions: [{ prompt: "SI unit of pressure?", options: ["N", "Pa", "J", "W"], correct_index: 1 }],
    });
    expect(md).toContain("Template generated from the school's approved material");
    expect(md).toContain("A force is a push or a pull.");
    expect(md).toContain("Answer: Pa");
  });
});
