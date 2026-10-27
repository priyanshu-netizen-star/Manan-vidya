import { describe, expect, it } from "vitest";
import { scoreQuiz, masteryBand } from "@/lib/quiz";
import { BUDGET_LINES, MILESTONES, PROJECT_FEE, budgetTotal, formatINR, milestonePercentTotal, milestoneTotal, unallocatedAmount } from "@/lib/commercial";
import { ENQUIRY_FLOW, LEAVE_FLOW, MAINT_FLOW, TASK_FLOW, canTransition } from "@/lib/workflows";
import { decideAssistantReply, type KbEntry } from "@/lib/kb";
import { KB, CODING_LESSONS, TOPICS } from "@/lib/seed-content";
import { runRobot, type RobotSpec } from "@/lib/robot";
import { screenStudentInput, admissionsSensitivity } from "@/lib/safety";
import { rankPassages } from "@/lib/text";
import { ROLES, ROLE_PERMISSIONS, can } from "@/lib/rbac";

describe("quiz scoring", () => {
  const qs = [
    { id: 1, correct_index: 2, options: ["a", "b", "c", "d"] },
    { id: 2, correct_index: 0, options: ["a", "b", "c", "d"] },
    { id: 3, correct_index: 3, options: ["a", "b", "c", "d"] },
  ];
  it("scores correct, wrong and unanswered questions", () => {
    const r = scoreQuiz(qs, { "1": 2, "2": 1 });
    expect(r.score).toBe(1);
    expect(r.total).toBe(3);
    expect(r.percent).toBe(33);
    expect(r.results.map((x) => x.isCorrect)).toEqual([true, false, false]);
    expect(r.results[2].chosen).toBeNull();
  });
  it("gives full marks for all correct", () => {
    expect(scoreQuiz(qs, { "1": 2, "2": 0, "3": 3 })).toMatchObject({ score: 3, percent: 100 });
  });
  it("treats out-of-range and non-integer answers as unanswered", () => {
    const r = scoreQuiz(qs, { "1": 7, "2": 0.5 as number, "3": -1 });
    expect(r.score).toBe(0);
    expect(r.results.every((x) => x.chosen === null)).toBe(true);
  });
  it("rejects answers to questions not in the quiz", () => {
    expect(() => scoreQuiz(qs, { "99": 1 })).toThrow();
  });
  it("handles an empty quiz", () => {
    expect(scoreQuiz([], {})).toMatchObject({ score: 0, total: 0, percent: 0 });
  });
  it("maps mastery bands", () => {
    expect(masteryBand(null)).toBe("not_started");
    expect(masteryBand(49)).toBe("needs_support");
    expect(masteryBand(50)).toBe("developing");
    expect(masteryBand(80)).toBe("secure");
  });
});

describe("commercial terms", () => {
  it("keeps the supplied line items unchanged and exposes the ₹15,000 reconciliation gap", () => {
    expect(BUDGET_LINES.map((l) => l.amount)).toEqual([20000, 80000, 75000, 60000, 55000, 25000, 20000]);
    expect(budgetTotal()).toBe(335000);
    expect(PROJECT_FEE).toBe(350000);
    expect(unallocatedAmount()).toBe(15000);
    // The table shown to the school balances: line items + unallocated row = project fee.
    expect(budgetTotal() + unallocatedAmount()).toBe(PROJECT_FEE);
  });
  it("milestones are 40/30/20/10 and total ₹3,50,000", () => {
    expect(MILESTONES.map((m) => m.percent)).toEqual([40, 30, 20, 10]);
    expect(milestonePercentTotal()).toBe(100);
    expect(milestoneTotal()).toBe(350000);
    for (const m of MILESTONES) expect(m.amount).toBe((PROJECT_FEE * m.percent) / 100);
  });
  it("formats rupees with Indian grouping", () => {
    expect(formatINR(350000)).toBe("₹3,50,000");
    expect(formatINR(140000)).toBe("₹1,40,000");
    expect(formatINR(20000)).toBe("₹20,000");
    expect(formatINR(500)).toBe("₹500");
    expect(formatINR(12345678)).toBe("₹1,23,45,678");
  });
});

describe("workflows", () => {
  it("enforces enquiry transitions", () => {
    expect(canTransition(ENQUIRY_FLOW, "new", "contacted")).toBe(true);
    expect(canTransition(ENQUIRY_FLOW, "new", "admitted")).toBe(false);
    expect(canTransition(ENQUIRY_FLOW, "admitted", "new")).toBe(false);
  });
  it("enforces leave transitions", () => {
    expect(canTransition(LEAVE_FLOW, "pending", "approved")).toBe(true);
    expect(canTransition(LEAVE_FLOW, "pending", "checked_out")).toBe(false);
    expect(canTransition(LEAVE_FLOW, "rejected", "approved")).toBe(false);
    expect(canTransition(LEAVE_FLOW, "checked_out", "returned")).toBe(true);
  });
  it("enforces maintenance and task transitions", () => {
    expect(canTransition(MAINT_FLOW, "closed", "open")).toBe(false);
    expect(canTransition(TASK_FLOW, "done", "open")).toBe(true);
  });
});

describe("admissions assistant decisions", () => {
  const entries: KbEntry[] = KB.filter((k) => !("published" in k) || k.published).map((k, i) => ({
    id: i + 1, category: k.category, question_en: k.question_en, answer_en: k.answer_en, question_hi: k.question_hi,
    answer_hi: k.answer_hi, keywords: k.keywords, source: k.source, verification: k.verification, hindi_reviewed: false,
  }));
  it("answers covered questions from the knowledge base", () => {
    const d = decideAssistantReply("What documents are required for admission?", entries);
    expect(d.mode).toBe("knowledge_base");
    if (d.mode === "knowledge_base") expect(d.matches[0].entry.category).toBe("Admissions");
  });
  it("answers in Hindi too", () => {
    const d = decideAssistantReply("क्या स्कूल में हॉस्टल की सुविधा है?", entries);
    expect(d.mode).toBe("knowledge_base");
    if (d.mode === "knowledge_base") expect(d.matches[0].entry.category).toBe("Boarding");
  });
  it("escalates fee questions to staff", () => {
    const d = decideAssistantReply("What are the hostel fees?", entries);
    expect(d.mode).toBe("escalated");
  });
  it("escalates fee questions asked in Hindi", () => {
    expect(decideAssistantReply("कक्षा 5 की फीस कितनी है?", entries).mode).toBe("escalated");
  });
  it("escalates questions outside the knowledge base", () => {
    expect(decideAssistantReply("Who won the cricket world cup in 1983?", entries).mode).toBe("escalated");
  });
  it("escalates guarantee requests", () => {
    expect(admissionsSensitivity("Can you guarantee admission for my child?")).not.toBeNull();
  });
});

describe("safety screening", () => {
  it("routes wellbeing concerns away from the AI", () => {
    expect(screenStudentInput("I am being bullied in the hostel").kind).toBe("wellbeing");
  });
  it("blocks personal contact details", () => {
    expect(screenStudentInput("my number is 9876543210").kind).toBe("personal_info");
  });
  it("allows normal questions", () => {
    expect(screenStudentInput("why does pressure increase with depth?").kind).toBe("ok");
  });
});

describe("retrieval over approved material", () => {
  it("finds the relevant passage", () => {
    const t = TOPICS.find((x) => x.name === "Force and Pressure")!;
    const res = rankPassages("why do school bags have wide straps", [{ id: 1, title: t.material.title, body: t.material.body }]);
    expect(res[0].text).toMatch(/straps/);
  });
});

describe("robot simulator", () => {
  type AnyChallenge = { slug: string; kind: string; spec: unknown };
  const lessons = CODING_LESSONS as unknown as readonly { challenges: readonly AnyChallenge[] }[];
  const challenges = lessons.flatMap((l) => l.challenges).filter((c) => c.kind === "robot");
  it("the hinted solution reaches the goal for every robot challenge", () => {
    const solutions: Record<string, string> = {
      "robot-first-route": "forward 3\nright\nforward 2\nleft\nforward 2",
      "robot-staircase": "repeat 6 {\n forward\n right\n forward\n left\n}",
    };
    for (const c of challenges) {
      const run = runRobot(c.spec as unknown as RobotSpec, solutions[c.slug]);
      expect(run.error, c.slug).toBeNull();
      expect(run.reachedGoal, c.slug).toBe(true);
    }
  });
  it("reports walls and syntax errors", () => {
    const spec = challenges[0].spec as unknown as RobotSpec;
    expect(runRobot(spec, "right\nforward").error).toMatch(/wall/);
    expect(runRobot(spec, "jump").error).toMatch(/unknown command/);
    expect(runRobot(spec, "repeat 2 { forward").error).toMatch(/Missing/);
  });
});

describe("seed content quality", () => {
  it("every question has 4 options and a valid answer", () => {
    for (const t of TOPICS) {
      expect(t.questions.length).toBeGreaterThanOrEqual(5);
      for (const q of t.questions) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(q.explanation.length).toBeGreaterThan(10);
      }
    }
  });
  it("every knowledge-base entry cites a source and has a Hindi version", () => {
    for (const k of KB) {
      expect(k.source).toMatch(/mananvidya\.com/);
      expect(k.answer_hi.length).toBeGreaterThan(10);
    }
  });
});

describe("role permissions", () => {
  it("students and parents cannot reach staff functions", () => {
    for (const role of ["student", "parent"] as const) {
      for (const p of ["enquiry.manage", "students.read", "content.manage", "hostel.manage", "command.view", "users.manage"] as const) {
        expect(can(role, p), `${role} ${p}`).toBe(false);
      }
    }
  });
  it("only the platform administrator can reset data or manage users", () => {
    for (const role of ROLES) {
      expect(can(role, "system.reset")).toBe(role === "platform_admin");
      expect(can(role, "users.manage")).toBe(role === "platform_admin");
    }
  });
  it("every role has at least one permission", () => {
    for (const role of ROLES) expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
  });
});
