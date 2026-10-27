import { z } from "zod";
import { copilotReply, withFallback } from "@/lib/ai-features";
import { ChatMessages, lastUserText, logAi, safetyReply } from "@/lib/ai-http";
import { helpPassages } from "@/lib/grounding";
import { apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { roleFacts, type Fact } from "@/lib/insights";
import { menuNames } from "@/lib/nav";
import type { Passage } from "@/lib/text";

const Input = z.object({ messages: ChatMessages.min(1) });

/** The AI Copilot: answers from the signed-in user's own role-scoped facts and the user guide only. */
export const POST = route(async (req) => {
  const user = await apiUser(req);
  limit(req, `copilot:${user.id}`, 30, 600);
  const { messages } = await body(req, Input);
  const question = lastUserText(messages);
  const safety = safetyReply(user, question);
  if (safety) return ok({ mode: "safety", answer: safety, links: [] });

  const [facts, help] = await Promise.all([roleFacts(user), helpPassages(question)]);
  const out = await withFallback(
    () => copilotReply({ userKey: String(user.id), role: user.role, firstName: user.name.split(" ")[0], facts, help, pages: menuNames(user.role), messages }),
    () => automaticAnswer(facts, help),
  );
  await logAi(user, "copilot", out.mode, undefined, undefined, clientIp(req));
  return ok({ mode: out.mode, answer: out.result, notice: out.notice, links: links(facts) });
});

function links(facts: Fact[]) {
  const seen = new Set<string>();
  return facts.filter((f) => f.href && !seen.has(f.href) && seen.add(f.href)).slice(0, 4).map((f) => ({ href: f.href!, text: f.text }));
}

function automaticAnswer(facts: Fact[], help: Passage[]) {
  const parts = [];
  if (help.length) parts.push(`**From the user guide: ${help[0].title}**\n\n${help.slice(0, 2).map((h) => h.text).join("\n\n")}`);
  if (facts.length) parts.push(`**What I can see for you right now**\n\n${facts.map((f) => `- ${f.text}`).join("\n")}`);
  return parts.join("\n\n") || "I could not find anything about that. Try the User guides page.";
}
