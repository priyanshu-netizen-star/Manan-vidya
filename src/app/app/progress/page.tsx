import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/dates";
import { MASTERY_LABEL, masteryBand } from "@/lib/quiz";
import { recentAttempts, studentInfo, studentTopicProgress } from "@/lib/queries";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requirePageUser("progress.view_own");
  const s = user.studentId ? await studentInfo(user.studentId) : null;
  if (!s) {
    return (
      <div className="card">
        <EmptyState title="No linked student record">This account is not linked to a student. Ask the school office to link it.</EmptyState>
      </div>
    );
  }
  const [progress, attempts] = await Promise.all([studentTopicProgress(s.id, s.level), recentAttempts(s.id, 15)]);
  return (
    <div>
      <PageHeader eyebrow={`${s.name} · ${s.class_name}`} title="Learning progress" description="Mastery bands describe quiz results only. They support learning conversations and are never used for automated decisions." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Topics" pad={false}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Topic</th><th>Attempts</th><th>Best</th><th>Status</th></tr></thead>
              <tbody>
                {progress.map((p) => {
                  const band = masteryBand(p.best_percent);
                  return (
                    <tr key={p.topic_id}>
                      <td><span className="text-muted">{p.subject} · </span>{p.topic}</td>
                      <td>{p.attempts}</td>
                      <td>{p.best_percent == null ? "—" : `${p.best_percent}%`}</td>
                      <td><StatusBadge status={band} label={MASTERY_LABEL[band]} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Recent quiz attempts" pad={false}>
          {attempts.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Quiz</th><th>Score</th><th>When</th></tr></thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.topic}</td>
                      <td>{a.score} / {a.total}</td>
                      <td>{fmtDateTime(a.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No quizzes taken yet" />
          )}
        </Card>
      </div>
    </div>
  );
}
