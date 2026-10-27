/**
 * PostgreSQL schema (idempotent). Applied automatically at start-up and by `npm run db:migrate`.
 * Every operational table carries `seeded` so synthetic presentation records can always be
 * identified and removed before go-live (see docs/09-privacy-security-child-safety.md).
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  level INT NOT NULL,
  section TEXT NOT NULL DEFAULT 'A',
  academic_year TEXT NOT NULL,
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (level, section, academic_year)
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  admission_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  class_id INT REFERENCES classes(id),
  roll_no INT,
  gender TEXT CHECK (gender IN ('F','M','O')),
  date_of_birth DATE,
  guardian_name TEXT,
  guardian_phone TEXT,
  is_boarder BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','alumni')),
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','parent','teacher','office_admin','warden','management','platform_admin')),
  password_hash TEXT NOT NULL,
  student_id INT REFERENCES students(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS teaching_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_level INT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  UNIQUE (subject_id, class_level, name)
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_by INT REFERENCES users(id),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  source TEXT NOT NULL DEFAULT 'teacher' CHECK (source IN ('teacher','ai_draft')),
  created_by INT REFERENCES users(id),
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);

CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by INT REFERENCES users(id),
  published_by INT REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (quiz_id, question_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);

CREATE TABLE IF NOT EXISTS worksheets (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL DEFAULT '',
  question_ids JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_by INT REFERENCES users(id),
  approved_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS lesson_plans (
  id SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  generation TEXT NOT NULL DEFAULT 'manual' CHECK (generation IN ('manual','template','ai')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_events (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id INT REFERENCES topics(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('material_view','question_asked','quiz_attempt','coding_progress')),
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_student ON learning_events(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by INT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  held_on DATE,
  max_marks INT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked')),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS marks (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  marks NUMERIC(5,1),
  entered_by INT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (exam_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  module TEXT NOT NULL DEFAULT 'administration',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done')),
  assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS kb_entries (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  question_en TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  question_hi TEXT NOT NULL DEFAULT '',
  answer_hi TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  verification TEXT NOT NULL DEFAULT 'pending_school' CHECK (verification IN ('public_source','pending_school','school_confirmed')),
  hindi_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id SERIAL PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  child_name TEXT NOT NULL,
  grade_sought TEXT NOT NULL,
  boarding_interest TEXT NOT NULL DEFAULT 'undecided' CHECK (boarding_interest IN ('day','boarding','undecided')),
  message TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','hi')),
  source TEXT NOT NULL DEFAULT 'web_form',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','visit_scheduled','application_submitted','admitted','closed')),
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_reason TEXT,
  next_follow_up DATE,
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);

CREATE TABLE IF NOT EXISTS assistant_logs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  language TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('knowledge_base','ai','escalated')),
  matched_ids JSONB NOT NULL DEFAULT '[]',
  escalation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id SERIAL PRIMARY KEY,
  block TEXT NOT NULL,
  room_no TEXT NOT NULL,
  capacity INT NOT NULL,
  UNIQUE (block, room_no)
);

CREATE TABLE IF NOT EXISTS hostel_beds (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  UNIQUE (room_id, label)
);

CREATE TABLE IF NOT EXISTS bed_allocations (
  id SERIAL PRIMARY KEY,
  bed_id INT NOT NULL REFERENCES hostel_beds(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE,
  allocated_by INT REFERENCES users(id),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed ON bed_allocations(bed_id) WHERE to_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_student_bed ON bed_allocations(student_id) WHERE to_date IS NULL;

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_by INT REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('leave','outpass')),
  depart_at TIMESTAMPTZ NOT NULL,
  return_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  escort_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','checked_out','returned','cancelled')),
  decided_by INT REFERENCES users(id),
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS hostel_attendance (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('morning','night')),
  status TEXT NOT NULL CHECK (status IN ('present','absent','on_leave')),
  marked_by INT REFERENCES users(id),
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (student_id, date, session)
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES hostel_rooms(id) ON DELETE SET NULL,
  raised_by INT REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('electrical','plumbing','furniture','cleaning','other')),
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id INT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_entity ON status_history(entity, entity_id);

CREATE TABLE IF NOT EXISTS coding_lessons (
  id SERIAL PRIMARY KEY,
  track TEXT NOT NULL CHECK (track IN ('python','web','ai_literacy','robotics')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'beginner',
  body TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coding_challenges (
  id SERIAL PRIMARY KEY,
  lesson_id INT NOT NULL REFERENCES coding_lessons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('python','javascript','html','robot','mcq')),
  prompt TEXT NOT NULL,
  starter TEXT NOT NULL DEFAULT '',
  spec JSONB NOT NULL DEFAULT '{}',
  hint TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS coding_progress (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id INT NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attempted','passed')),
  verified_by TEXT NOT NULL DEFAULT 'client_tests' CHECK (verified_by IN ('client_tests','server')),
  code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  track TEXT NOT NULL,
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  hardware_needed TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}',
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Report-card remarks: drafted by a teacher (optionally with AI help); families see only approved remarks.
CREATE TABLE IF NOT EXISTS report_remarks (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  remark TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seeded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (exam_id, student_id)
);

-- Additive upgrades for databases created before these columns existed.
ALTER TABLE materials ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'teacher';
`;
