import "server-only";
import { z } from "zod";
import { audit } from "./audit";
import { getDb } from "./db";
import type { SessionUser } from "./auth";
import { WELLBEING_MESSAGE, screenStudentInput } from "./safety";
import { isHindi } from "./text";

/** Shared pieces for the /api/ai/* routes. */

export const ChatMessages = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
  .max(20);

export const lastUserText = (messages: { role: string; content: string }[]) =>
  [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

/**
 * Child-safety screening before any free text from a student or parent reaches the AI.
 * Returns a safety reply to show instead, or null when the text may proceed.
 */
export function safetyReply(user: SessionUser, text: string): string | null {
  if (!text || (user.role !== "student" && user.role !== "parent")) return null;
  const screen = screenStudentInput(text);
  if (screen.kind === "wellbeing") return WELLBEING_MESSAGE[isHindi(text) ? "hi" : "en"];
  if (screen.kind === "personal_info") return "Please do not share phone numbers, email addresses or other personal details here. Ask again without them.";
  if (screen.kind === "too_long") return "That message is too long. Please ask a shorter question.";
  return null;
}

/** Every AI use is logged (feature and mode only, never the content). */
export async function logAi(user: SessionUser, feature: string, mode: string, entity?: string, entityId?: number | string, ip?: string) {
  const db = await getDb();
  await audit(db, user.id, `ai.${feature}`, entity, entityId, { mode }, ip);
}
