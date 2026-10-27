import { z } from "zod";

/** Shared input schemas. Form posts arrive as strings, so numbers are coerced. */

export const QuestionInput = z.object({
  topicId: z.coerce.number().int().positive(),
  prompt: z.string().trim().min(5).max(600),
  options: z.array(z.string().trim().min(1).max(200)).length(4, "Provide exactly 4 options"),
  correctIndex: z.coerce.number().int().min(0).max(3),
  explanation: z.string().trim().min(5).max(1000),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

/** Accepts a single id, a list of ids, or nothing (unchecked checkboxes). */
export const idList = z.preprocess(
  (v) => (v === undefined || v === "" || v === false ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.coerce.number().int().positive()).max(200),
);

export const optionalDate = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").nullable(),
);

export const requiredDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

export const phone = z.string().trim().regex(/^[+]?[0-9 ()-]{10,16}$/, "Enter a valid phone number");

export const boolish = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

/** "classId:topicId" from a combined select. */
export const classTopic = z
  .string()
  .regex(/^\d+:\d+$/, "Choose a class and topic")
  .transform((v) => {
    const [classId, topicId] = v.split(":").map(Number);
    return { classId, topicId };
  });

/** Admissions knowledge-base entry (staff editor). */
export const KbInput = z.object({
  category: z.string().trim().min(2).max(60),
  question_en: z.string().trim().min(5).max(300),
  answer_en: z.string().trim().min(5).max(2000),
  question_hi: z.string().trim().max(300).default(""),
  answer_hi: z.string().trim().max(2000).default(""),
  keywords: z.string().trim().max(500).default(""),
  source: z.string().trim().max(500).default(""),
  verification: z.enum(["public_source", "pending_school", "school_confirmed"]),
  hindi_reviewed: boolish,
  published: boolish,
});


export const StudentInput = z.object({
  admissionNo: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(100),
  classId: z.coerce.number().int().positive(),
  rollNo: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).max(200).nullable()),
  gender: z.enum(["F", "M", "O"]),
  dateOfBirth: optionalDate,
  guardianName: z.string().trim().max(100).default(""),
  guardianPhone: z.preprocess((v) => (v === "" ? null : v), phone.nullable()),
  isBoarder: boolish,
});

export const TaskInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).default(""),
  module: z.enum(["administration", "academics", "admissions", "examinations", "hostel", "it"]),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  assigneeId: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable()),
  dueDate: optionalDate,
});
