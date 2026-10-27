import "server-only";
import { getDb } from "./db";
import { readDoc } from "./docs";
import { leadingPassages, passages as splitPassages, rankPassages, type Passage } from "./text";

/** Approved material for a topic, ranked against the query; falls back to the opening passages (e.g. for Hindi questions). */
export async function approvedPassages(topicId: number, query: string, k = 6): Promise<Passage[]> {
  const db = await getDb();
  const materials = await db.query<{ id: number; title: string; body: string }>(
    "SELECT id, title, body FROM materials WHERE topic_id = $1 AND status = 'approved' ORDER BY id",
    [topicId],
  );
  const ranked = query.trim() ? rankPassages(query, materials, k) : [];
  return ranked.length ? ranked : leadingPassages(materials, k);
}

let manual: { id: number; title: string; body: string }[] | null = null;

/** User-manual sections (docs/11) that best match a question, for the Copilot's "how do I…" answers. */
export async function helpPassages(query: string, k = 4): Promise<Passage[]> {
  if (!manual) {
    const doc = await readDoc("user-manuals");
    manual = (doc?.body ?? "")
      .split(/\n(?=#{2,3} )/)
      .map((section, i) => ({ id: i, title: section.match(/^#{2,3}\s+(.+)/)?.[1] ?? "User manual", body: section.replace(/^#{2,3}\s+.+\n/, "") }))
      .filter((m) => m.body.trim());
  }
  const ranked = rankPassages(query, manual, k);
  return ranked.length ? ranked : manual.slice(0, 1).flatMap((m) => splitPassages(m.body).slice(0, 2).map((text) => ({ materialId: m.id, title: m.title, text, score: 0 })));
}
