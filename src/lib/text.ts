/** Lightweight bilingual (English / Hindi) text utilities used for retrieval and screening. */

const STOP_EN = new Set(
  "a an the is are was were be been am i me my we our you your he she it they them their this that these those of to in on at for from by with and or not no do does did can could would should will shall may might what which who whom whose when where why how about into over under than then there here also any all some please tell know want need get have has had".split(
    " ",
  ),
);
const STOP_HI = new Set(
  "का की के को में से पर है हैं था थी थे और या भी तो ही यह वह ये वो क्या कैसे कब कहाँ कहां क्यों कौन मैं हम आप मेरा मेरी मेरे हमारा हमारी हमारे आपका आपकी आपके एक कुछ लिए बारे बताइए बताएं बताओ चाहिए होता होती होते हो जाता जाती करना करें कर".split(
    " ",
  ),
);

export function isHindi(text: string) {
  return /[ऀ-ॿ]/.test(text);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_EN.has(t) && !STOP_HI.has(t))
    .map(stem);
}

/** Very small English stemmer: enough to match "admissions"/"admission", "boarding"/"boarders". */
function stem(t: string) {
  if (/[ऀ-ॿ]/.test(t)) return t;
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 4 && t.endsWith("ers")) return t.slice(0, -3);
  if (t.length > 3 && t.endsWith("es") && !t.endsWith("ses")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

/** Overlap score in [0,1]: fraction of query tokens found in the document tokens (keywords weighted). */
export function overlapScore(queryTokens: string[], docTokens: Set<string>, keywordTokens: Set<string> = new Set()) {
  if (!queryTokens.length) return 0;
  let hits = 0;
  for (const t of new Set(queryTokens)) {
    if (keywordTokens.has(t)) hits += 1.5;
    else if (docTokens.has(t)) hits += 1;
  }
  return Math.min(1, hits / new Set(queryTokens).size);
}

/** Split long material into paragraph-sized passages for retrieval. */
export function passages(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export type Passage = { materialId: number; title: string; text: string; score: number };

export function rankPassages(query: string, materials: { id: number; title: string; body: string }[], k = 3): Passage[] {
  const q = tokenize(query);
  const scored: Passage[] = [];
  for (const m of materials) {
    const titleTokens = new Set(tokenize(m.title));
    for (const p of passages(m.body)) {
      const score = overlapScore(q, new Set(tokenize(p)), titleTokens);
      if (score > 0) scored.push({ materialId: m.id, title: m.title, text: p, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}

/** The opening passages of a topic's material, for questions keyword search cannot match (for example, asked in Hindi). */
export function leadingPassages(materials: { id: number; title: string; body: string }[], k = 6): Passage[] {
  const out: Passage[] = [];
  for (let i = 0; out.length < k; i++) {
    let added = false;
    for (const m of materials) {
      const p = passages(m.body)[i];
      if (p && out.length < k) {
        out.push({ materialId: m.id, title: m.title, text: p, score: 0 });
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
