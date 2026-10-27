import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import { studentLevel } from "@/lib/access";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { QuizRunner } from "./QuizRunner";

export const metadata = { title: "Quiz" };

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const user = await requirePageUser("learning.use");
  const quizId = Number((await params).quizId);
  if (!Number.isInteger(quizId)) notFound();
  const db = await getDb();
  const quiz = await db.one<{ id: number; title: string; instructions: string; status: string; topic_id: number; topic: string; level: number; class_name: string }>(
    `SELECT qz.id, qz.title, qz.instructions, qz.status, qz.topic_id, t.name AS topic, c.level, c.name AS class_name
       FROM quizzes qz JOIN topics t ON t.id = qz.topic_id JOIN classes c ON c.id = qz.class_id WHERE qz.id = $1`,
    [quizId],
  );
  if (!quiz) notFound();
  if (user.role === "student" && (quiz.status !== "published" || (await studentLevel(user)) !== quiz.level)) redirect("/app/learn");
  // Correct answers are deliberately NOT selected: they are revealed only by the scoring API after submission.
  const questions = await db.query<{ id: number; prompt: string; options: string[] }>(
    `SELECT q.id, q.prompt, q.options FROM quiz_questions qq JOIN questions q ON q.id = qq.question_id WHERE qq.quiz_id = $1 ORDER BY qq.position`,
    [quizId],
  );
  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2"><Link href={`/app/learn/${quiz.topic_id}`} className="text-brand font-semibold">← {quiz.topic}</Link></p>
      <PageHeader eyebrow={`${quiz.class_name} · ${questions.length} questions`} title={quiz.title} description={quiz.instructions} />
      {user.role !== "student" && (
        <div className="mb-4"><Notice>Staff preview: your answers are scored but not saved{quiz.status !== "published" ? ". This quiz is not yet published to students." : "."}</Notice></div>
      )}
      <QuizRunner quizId={quiz.id} questions={questions} topicId={quiz.topic_id} />
    </div>
  );
}
