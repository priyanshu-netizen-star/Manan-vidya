import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb, resetDbSingleton, type Db } from "@/lib/db";

let db: Db;
beforeAll(async () => {
  await resetDbSingleton();
  db = await getDb();
});
afterAll(resetDbSingleton);

describe("database seed (embedded Postgres)", () => {
  it("creates synthetic records in every module", async () => {
    const counts = await db.one<Record<string, number>>(`SELECT
      (SELECT count(*)::int FROM students) AS students,
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM quizzes WHERE status = 'published') AS quizzes,
      (SELECT count(*)::int FROM quiz_attempts) AS attempts,
      (SELECT count(*)::int FROM attendance) AS attendance,
      (SELECT count(*)::int FROM marks) AS marks,
      (SELECT count(*)::int FROM enquiries) AS enquiries,
      (SELECT count(*)::int FROM kb_entries) AS kb,
      (SELECT count(*)::int FROM leave_requests) AS leaves,
      (SELECT count(*)::int FROM bed_allocations) AS beds,
      (SELECT count(*)::int FROM coding_challenges) AS challenges`);
    expect(counts).toMatchObject({ students: 36, users: 8, quizzes: 10, enquiries: 10, leaves: 6 });
    for (const [k, v] of Object.entries(counts!)) expect(v, k).toBeGreaterThan(0);
  });

  it("flags every student record as synthetic", async () => {
    const r = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM students WHERE NOT seeded");
    expect(r!.n).toBe(0);
  });

  it("uses reserved example domains for every account", async () => {
    const r = await db.query<{ email: string }>("SELECT email FROM users");
    for (const u of r) expect(u.email).toMatch(/\.example$/);
  });

  it("returns dates as YYYY-MM-DD strings and counts as numbers", async () => {
    const r = await db.one<{ date: string; n: number }>("SELECT date, count(*) AS n FROM attendance GROUP BY date LIMIT 1");
    expect(r!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof r!.n).toBe("number");
  });

  it("stored quiz scores match the stored answers", async () => {
    const attempts = await db.query<{ answers: Record<string, number>; score: number; quiz_id: number }>("SELECT answers, score, quiz_id FROM quiz_attempts LIMIT 40");
    for (const a of attempts) {
      const key = await db.query<{ id: number; correct_index: number }>(
        "SELECT q.id, q.correct_index FROM quiz_questions qq JOIN questions q ON q.id = qq.question_id WHERE qq.quiz_id = $1",
        [a.quiz_id],
      );
      const expected = key.filter((k) => a.answers[String(k.id)] === k.correct_index).length;
      expect(a.score).toBe(expected);
    }
  });

  it("never allocates one bed to two students", async () => {
    const r = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM (SELECT bed_id FROM bed_allocations WHERE to_date IS NULL GROUP BY bed_id HAVING count(*) > 1) x");
    expect(r!.n).toBe(0);
  });
});
