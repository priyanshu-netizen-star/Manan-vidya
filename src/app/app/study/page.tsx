import { PageHeader } from "@/components/ui";
import { studentLevel } from "@/lib/access";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/config";
import { manageableTopics, topicsWithSubjects } from "@/lib/queries";
import { StudyAssistant } from "./StudyAssistant";

export const metadata = { title: "AI study assistant" };

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await requirePageUser("learning.use");
  const sp = await searchParams;
  const level = user.role === "student" ? await studentLevel(user) : null;
  const rows = user.role === "teacher"
    ? (await manageableTopics(user)).map((t) => ({ id: t.id, name: t.name, subject: t.subject, level: t.class_level }))
    : (await topicsWithSubjects(level ?? undefined)).map((t) => ({ id: t.id, name: t.name, subject: t.subject, level: t.class_level }));
  const requested = Number(sp.topic);
  const initial = rows.some((t) => t.id === requested) ? requested : null;
  return (
    <div>
      <PageHeader
        eyebrow="Learning · AI"
        title="AI study assistant"
        description="A personal tutor for every topic, grounded only in your teacher's approved material. Explanations, worked examples, revision notes, flashcards and practice questions."
      />
      <StudyAssistant topics={rows} initialTopicId={initial} aiEnabled={aiConfigured()} />
    </div>
  );
}
