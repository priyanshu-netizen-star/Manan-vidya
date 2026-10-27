import type { Db, Queryable } from "./db";
import { addDays, lastSchoolDays, todayIST } from "./dates";
import { hashPassword } from "./password";
import { CODING_LESSONS, DRAFT_MATERIAL, KB, PROJECTS, SUBJECTS, TOPICS } from "./seed-content";

/**
 * Seeds the presentation environment with SYNTHETIC records only. No real student, parent
 * or staff information is used. Every operational row is flagged `seeded = true`.
 * Deterministic (fixed PRNG seed) so screenshots and tests are repeatable.
 */

export const SEED_ACCOUNTS = [
  { key: "student", email: "student@school-os.example", name: "Aarav Kumar", role: "student" },
  { key: "parent", email: "parent@school-os.example", name: "Sunita Devi (parent of Aarav)", role: "parent" },
  { key: "teacher", email: "teacher@school-os.example", name: "Priya Sinha", role: "teacher" },
  { key: "teacher2", email: "teacher2@school-os.example", name: "Rahul Tirkey", role: "teacher" },
  { key: "office", email: "office@school-os.example", name: "Neha Gupta", role: "office_admin" },
  { key: "warden", email: "warden@school-os.example", name: "Manoj Oraon", role: "warden" },
  { key: "management", email: "principal@school-os.example", name: "Principal (sample account)", role: "management" },
  { key: "admin", email: "admin@school-os.example", name: "VoxVision Support", role: "platform_admin" },
] as const;

export function seedPassword() {
  return process.env.SEED_PASSWORD || "Presentation@2026";
}

function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_F = ["Ananya", "Diya", "Ishita", "Kavya", "Meera", "Nisha", "Pooja", "Riya", "Sakshi", "Tanvi", "Anjali", "Jyoti", "Khushi", "Priyanka", "Shreya", "Sneha", "Muskan", "Payal"];
const FIRST_M = ["Aditya", "Arjun", "Rohit", "Vikash", "Saurabh", "Ankit", "Deepak", "Harsh", "Karan", "Nikhil", "Rahul", "Sumit", "Abhishek", "Aman", "Rajesh", "Vivek", "Yash", "Gaurav"];
const SURNAMES = ["Kumar", "Singh", "Oraon", "Munda", "Sharma", "Gupta", "Prasad", "Kerketta", "Tirkey", "Sahu", "Verma", "Mishra", "Lakra", "Ekka", "Toppo", "Mahato", "Soren", "Hansda"];

export async function seedDatabase(db: Db) {
  const rand = prng(20261027);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const today = todayIST();
  const year = "2026-27";

  await db.tx(async (q) => {
    const one = async <T,>(sql: string, p: unknown[]) => (await q.query<T>(sql, p))[0];
    const id = async (sql: string, p: unknown[]) => (await one<{ id: number }>(sql, p)).id;

    // ── Classes, subjects, students ─────────────────────────────────────
    const classIds: Record<number, number> = {};
    for (const level of [6, 7, 8]) {
      const roman = { 6: "VI", 7: "VII", 8: "VIII" }[level];
      classIds[level] = await id(
        "INSERT INTO classes (name, level, section, academic_year, seeded) VALUES ($1,$2,'A',$3,TRUE) RETURNING id",
        [`Class ${roman}`, level, year],
      );
    }
    const subjectIds: Record<string, number> = {};
    for (const s of SUBJECTS) subjectIds[s.name] = await id("INSERT INTO subjects (name, code) VALUES ($1,$2) RETURNING id", [s.name, s.code]);

    const students: { id: number; classLevel: number; gender: "F" | "M"; boarder: boolean; ability: number; name: string }[] = [];
    let admission = 1;
    for (const level of [6, 7, 8]) {
      for (let roll = 1; roll <= 12; roll++) {
        const isFirst = level === 8 && roll === 1;
        const gender: "F" | "M" = isFirst ? "M" : roll % 2 === 0 ? "F" : "M";
        const name = isFirst ? "Aarav Kumar" : `${pick(gender === "F" ? FIRST_F : FIRST_M)} ${pick(SURNAMES)}`;
        const boarder = isFirst ? true : rand() < 0.5;
        const birthYear = 2026 - (level + 5) - 1;
        const dob = `${birthYear}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`;
        const sid = await id(
          `INSERT INTO students (admission_no, name, class_id, roll_no, gender, date_of_birth, guardian_name, guardian_phone, is_boarder, seeded)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE) RETURNING id`,
          [
            `SYN-${year.slice(0, 4)}-${String(admission++).padStart(3, "0")}`, name, classIds[level], roll, gender, dob,
            isFirst ? "Sunita Devi" : `${pick(["Mr.", "Mrs."])} ${name.split(" ")[1]}`,
            `90000${String(10000 + Math.floor(rand() * 89999))}`, boarder,
          ],
        );
        students.push({ id: sid, classLevel: level, gender, boarder, ability: isFirst ? 0.72 : 0.45 + rand() * 0.5, name });
      }
    }
    const aarav = students.find((s) => s.name === "Aarav Kumar")!;

    // ── Users ────────────────────────────────────────────────────────────
    const hash = await hashPassword(seedPassword());
    const userIds: Record<string, number> = {};
    for (const a of SEED_ACCOUNTS) {
      const studentId = a.role === "student" || a.role === "parent" ? aarav.id : null;
      userIds[a.key] = await id(
        "INSERT INTO users (email, name, role, password_hash, student_id, seeded) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id",
        [a.email, a.name, a.role, hash, studentId],
      );
    }
    const t1 = userIds.teacher;
    const t2 = userIds.teacher2;
    for (const level of [6, 7, 8]) {
      for (const [subject, teacher] of [["Mathematics", t1], ["Science", t1], ["English", t2], ["Social Science", t2], ["Computer Science", t2], ["Hindi", t2]] as const) {
        await q.query("INSERT INTO teaching_assignments (teacher_id, class_id, subject_id) VALUES ($1,$2,$3)", [teacher, classIds[level], subjectIds[subject]]);
      }
    }

    // ── Topics, materials, questions, quizzes ───────────────────────────
    const quizMeta: { quizId: number; classLevel: number; topicId: number; questions: { id: number; answer: number }[] }[] = [];
    let pos = 0;
    for (const t of TOPICS) {
      const topicId = await id(
        "INSERT INTO topics (subject_id, class_level, name, summary, position) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [subjectIds[t.subject], t.classLevel, t.name, t.summary, pos++],
      );
      const author = ["Mathematics", "Science"].includes(t.subject) ? t1 : t2;
      await q.query(
        `INSERT INTO materials (topic_id, title, body, status, created_by, approved_by, approved_at, seeded)
         VALUES ($1,$2,$3,'approved',$4,$4,now(),TRUE)`,
        [topicId, t.material.title, t.material.body, author],
      );
      const qids: { id: number; answer: number }[] = [];
      for (const question of t.questions) {
        const qid = await id(
          `INSERT INTO questions (topic_id, prompt, options, correct_index, explanation, difficulty, status, source, created_by, reviewed_by, reviewed_at, seeded)
           VALUES ($1,$2,$3,$4,$5,$6,'approved','teacher',$7,$7,now(),TRUE) RETURNING id`,
          [topicId, question.prompt, JSON.stringify(question.options), question.answer, question.explanation, question.difficulty ?? "medium", author],
        );
        qids.push({ id: qid, answer: question.answer });
      }
      const quizId = await id(
        `INSERT INTO quizzes (title, topic_id, class_id, instructions, status, created_by, published_by, published_at, seeded)
         VALUES ($1,$2,$3,$4,'published',$5,$5,now() - interval '21 days',TRUE) RETURNING id`,
        [`${t.name}: practice quiz`, topicId, classIds[t.classLevel], "Answer every question. You will see explanations after you submit.", author],
      );
      for (const [i, qq] of qids.entries()) await q.query("INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES ($1,$2,$3)", [quizId, qq.id, i]);
      quizMeta.push({ quizId, classLevel: t.classLevel, topicId, questions: qids });
      if (t.name === DRAFT_MATERIAL.topic) {
        await q.query("INSERT INTO materials (topic_id, title, body, status, created_by, seeded) VALUES ($1,$2,$3,'draft',$4,TRUE)", [
          topicId, DRAFT_MATERIAL.title, DRAFT_MATERIAL.body, t1,
        ]);
      }
    }
    // A draft question awaiting review, to show the approval queue.
    const forceTopic = (await one<{ id: number }>("SELECT id FROM topics WHERE name = 'Force and Pressure'", [])).id;
    await q.query(
      `INSERT INTO questions (topic_id, prompt, options, correct_index, explanation, difficulty, status, source, created_by, seeded)
       VALUES ($1,$2,$3,1,$4,'medium','draft','teacher',$5,TRUE)`,
      [forceTopic, "Why is it easier to cut vegetables with a sharp knife than a blunt one?", JSON.stringify(["A sharp knife is heavier", "The force acts on a smaller area, so the pressure is greater", "A blunt knife has more friction only", "A sharp knife reduces the force"]), "A sharp edge has a very small area, so the same force produces a much greater pressure.", t1],
    );

    // ── Quiz attempts ───────────────────────────────────────────────────
    for (const s of students) {
      for (const [i, quiz] of quizMeta.filter((m) => m.classLevel === s.classLevel).entries()) {
        const attempt = s.id === aarav.id ? i % 2 === 0 : rand() < 0.8;
        if (!attempt) continue;
        const answers: Record<string, number> = {};
        let score = 0;
        for (const qq of quiz.questions) {
          const correct = rand() < s.ability;
          const chosen = correct ? qq.answer : (qq.answer + 1 + Math.floor(rand() * 3)) % 4;
          answers[qq.id] = chosen;
          if (chosen === qq.answer) score++;
        }
        const when = `${addDays(today, -Math.floor(1 + rand() * 18))}T${String(9 + Math.floor(rand() * 8)).padStart(2, "0")}:15:00+05:30`;
        await q.query(
          "INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, total, submitted_at, seeded) VALUES ($1,$2,$3,$4,$5,$6,TRUE)",
          [quiz.quizId, s.id, JSON.stringify(answers), score, quiz.questions.length, when],
        );
        await q.query("INSERT INTO learning_events (student_id, topic_id, kind, detail, created_at) VALUES ($1,$2,'quiz_attempt',$3,$4)", [
          s.id, quiz.topicId, JSON.stringify({ quizId: quiz.quizId, score, total: quiz.questions.length }), when,
        ]);
      }
    }

    // ── Worksheet ───────────────────────────────────────────────────────
    const linTopic = await one<{ id: number }>("SELECT id FROM topics WHERE name = 'Linear Equations in One Variable'", []);
    const linQs = await q.query<{ id: number }>("SELECT id FROM questions WHERE topic_id = $1 ORDER BY id LIMIT 4", [linTopic.id]);
    await q.query(
      `INSERT INTO worksheets (title, topic_id, class_id, instructions, question_ids, status, created_by, approved_by, seeded)
       VALUES ($1,$2,$3,$4,$5,'approved',$6,$6,TRUE)`,
      ["Linear equations: homework sheet 1", linTopic.id, classIds[8], "Show every step of your working.", JSON.stringify(linQs.map((r) => r.id)), t1],
    );

    // ── Attendance (last 20 school days) ────────────────────────────────
    for (const date of lastSchoolDays(addDays(today, -1), 20)) {
      for (const s of students) {
        const r = rand();
        const status = r < 0.05 ? "absent" : r < 0.08 ? "late" : r < 0.09 ? "excused" : "present";
        await q.query("INSERT INTO attendance (student_id, date, status, marked_by, seeded) VALUES ($1,$2,$3,$4,TRUE)", [
          s.id, date, status, s.classLevel === 8 ? t1 : t2,
        ]);
      }
    }

    // ── Exams and marks ─────────────────────────────────────────────────
    for (const level of [6, 7, 8]) {
      const pt1 = await id(
        "INSERT INTO exams (name, class_id, held_on, max_marks, status, seeded) VALUES ('Periodic Test 1',$1,$2,50,'locked',TRUE) RETURNING id",
        [classIds[level], addDays(today, -40)],
      );
      await q.query("INSERT INTO exams (name, class_id, held_on, max_marks, status, seeded) VALUES ('Half-Yearly Examination',$1,$2,100,'open',TRUE)", [
        classIds[level], addDays(today, -3),
      ]);
      for (const s of students.filter((x) => x.classLevel === level)) {
        for (const subject of ["Mathematics", "Science", "English", "Social Science", "Hindi"]) {
          const m = Math.max(8, Math.min(50, Math.round((s.ability * 0.9 + rand() * 0.2) * 50)));
          await q.query("INSERT INTO marks (exam_id, student_id, subject_id, marks, entered_by, seeded) VALUES ($1,$2,$3,$4,$5,TRUE)", [
            pt1, s.id, subjectIds[subject], m, ["Mathematics", "Science"].includes(subject) ? t1 : t2,
          ]);
        }
      }
    }

    // ── Tasks ───────────────────────────────────────────────────────────
    const tasks = [
      ["Prepare Half-Yearly mark entry schedule", "examinations", "high", "in_progress", "office", 3],
      ["Collect pending Transfer Certificates for new admissions", "admissions", "normal", "open", "office", 7],
      ["Upload Class VIII Science worksheet for Microorganisms", "academics", "normal", "open", "teacher", 5],
      ["Review AI-learning pilot feedback from Class VIII", "academics", "normal", "open", "teacher", 10],
      ["Fix water cooler on Boys Hostel first floor", "hostel", "high", "blocked", "warden", 2],
      ["Parent–teacher meeting attendance summary", "administration", "low", "done", "office", -5],
      ["Verify admissions knowledge base answers with the principal", "admissions", "high", "open", "management", 4],
      ["Night roll-call register handover for weekend", "hostel", "normal", "in_progress", "warden", 1],
    ] as const;
    for (const [title, module, priority, status, who, due] of tasks) {
      const tid = await id(
        "INSERT INTO tasks (title, module, priority, status, assignee_id, created_by, due_date, seeded) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id",
        [title, module, priority, status, userIds[who], userIds.management, addDays(today, due)],
      );
      await q.query("INSERT INTO status_history (entity, entity_id, to_status, note, actor_id, actor_label) VALUES ('task',$1,'open','Task created',$2,'Principal (sample account)')", [tid, userIds.management]);
    }

    // ── Knowledge base ──────────────────────────────────────────────────
    for (const k of KB) {
      await q.query(
        `INSERT INTO kb_entries (category, question_en, answer_en, question_hi, answer_hi, keywords, source, verification, hindi_reviewed, published, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9,$10)`,
        [k.category, k.question_en, k.answer_en, k.question_hi, k.answer_hi, k.keywords, k.source, k.verification, "published" in k ? k.published : true, userIds.admin],
      );
    }

    // ── Enquiries (synthetic) ───────────────────────────────────────────
    const enquiries = [
      ["Ramesh Prasad", "Class VI", "boarding", "new", "en", "Interested in boarding for my son. When can we visit?", false, null],
      ["Kavita Sharma", "Class I", "day", "contacted", "en", "Please share the admission process for Class I.", false, null],
      ["Anil Munda", "Class XI", "boarding", "visit_scheduled", "hi", "विज्ञान स्ट्रीम में प्रवेश के बारे में जानना है।", false, null],
      ["Seema Gupta", "Prep", "day", "application_submitted", "en", "Application submitted at the office last week.", false, null],
      ["Deepak Singh", "Class IV", "undecided", "new", "en", "What are the hostel fees?", true, "Fees and payments are confirmed only by the school office."],
      ["Farida Khan", "Class VIII", "day", "admitted", "en", "Thank you for the quick help.", false, null],
      ["Suresh Oraon", "KG", "day", "closed", "hi", "हमने दूसरे स्कूल में प्रवेश ले लिया है।", false, null],
      ["Pinky Kumari", "Class IX", "boarding", "contacted", "en", "Does the hostel have separate facilities for girls?", false, null],
      ["Vijay Sahu", "Nursery", "day", "new", "en", "Is transport available from Kanke?", false, null],
      ["Meena Lakra", "Class VII", "boarding", "visit_scheduled", "en", "We would like a campus visit on Saturday.", false, null],
    ] as const;
    const path: Record<string, string[]> = {
      new: [], contacted: ["contacted"], visit_scheduled: ["contacted", "visit_scheduled"],
      application_submitted: ["contacted", "application_submitted"], admitted: ["contacted", "application_submitted", "admitted"], closed: ["contacted", "closed"],
    };
    for (const [i, [parent, grade, boarding, status, lang, message, escalated, reason]] of enquiries.entries()) {
      const created = `${addDays(today, -(14 - i))}T10:${String(10 + i).padStart(2, "0")}:00+05:30`;
      const eid = await id(
        `INSERT INTO enquiries (ref_code, parent_name, phone, email, child_name, grade_sought, boarding_interest, message, language, source, status, assigned_to, escalated, escalation_reason, next_follow_up, consent, created_at, updated_at, seeded)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16,$16,TRUE) RETURNING id`,
        [
          `MV-SAMPLE-${String(i + 1).padStart(2, "0")}`, parent, `98000${String(10000 + i * 731)}`, null, `${pick(i % 2 ? FIRST_F : FIRST_M)} ${parent.split(" ")[1]}`, grade, boarding, message, lang,
          i % 3 === 0 ? "assistant" : "web_form", status, status === "new" ? null : userIds.office, escalated, reason,
          ["admitted", "closed"].includes(status) ? null : addDays(today, (i % 4) + (status === "new" ? 0 : 1)), created,
        ],
      );
      await q.query("INSERT INTO status_history (entity, entity_id, to_status, note, actor_label, created_at) VALUES ('enquiry',$1,'new','Enquiry received','Parent (web form)',$2)", [eid, created]);
      let prev = "new";
      for (const [step, s] of path[status].entries()) {
        await q.query(
          "INSERT INTO status_history (entity, entity_id, from_status, to_status, note, actor_id, actor_label, created_at) VALUES ('enquiry',$1,$2,$3,$4,$5,'Neha Gupta',$6::timestamptz + make_interval(days => $7))",
          [eid, prev, s, s === "contacted" ? "Called parent and shared the admission process." : null, userIds.office, created, step + 1],
        );
        prev = s;
      }
    }

    // ── Hostel ──────────────────────────────────────────────────────────
    const beds: Record<"F" | "M", number[]> = { F: [], M: [] };
    for (const [block, prefix, g, rooms] of [["Boys Hostel", "B", "M", 6], ["Girls Hostel", "G", "F", 5]] as const) {
      for (let r = 1; r <= rooms; r++) {
        const roomId = await id("INSERT INTO hostel_rooms (block, room_no, capacity) VALUES ($1,$2,4) RETURNING id", [block, `${prefix}-10${r}`]);
        for (const label of ["A", "B", "C", "D"]) beds[g].push(await id("INSERT INTO hostel_beds (room_id, label) VALUES ($1,$2) RETURNING id", [roomId, label]));
      }
    }
    const boarders = students.filter((s) => s.boarder);
    for (const s of boarders) {
      const bed = beds[s.gender].shift();
      if (bed) await q.query("INSERT INTO bed_allocations (bed_id, student_id, from_date, allocated_by, seeded) VALUES ($1,$2,$3,$4,TRUE)", [bed, s.id, `${year.slice(0, 4)}-04-01`, userIds.warden]);
    }
    const leaves = [
      [aarav, "leave", 2, 4, "Family function at home", "pending", userIds.parent],
      [boarders[1], "outpass", 1, 1, "Dental appointment in Ranchi", "approved", userIds.warden],
      [boarders[2], "leave", -6, -3, "Festival at home", "returned", userIds.warden],
      [boarders[3], "outpass", 0, 0, "Visit to local guardian", "checked_out", userIds.warden],
      [boarders[4], "leave", 5, 7, "Sibling's wedding", "pending", userIds.warden],
      [boarders[5], "outpass", -2, -2, "Shopping without guardian escort", "rejected", userIds.warden],
    ] as const;
    for (const [s, kind, d1, d2, reason, status, by] of leaves) {
      const lid = await id(
        `INSERT INTO leave_requests (student_id, requested_by, kind, depart_at, return_at, reason, destination, escort_name, status, decided_by, decision_note, seeded)
         VALUES ($1,$2,$3,$4,$5,$6,'Home / Ranchi','Parent',$7,$8,$9,TRUE) RETURNING id`,
        [
          s.id, by, kind, `${addDays(today, d1)}T09:00:00+05:30`, `${addDays(today, d2)}T${kind === "outpass" ? "17" : "18"}:00:00+05:30`, reason, status,
          status === "pending" ? null : userIds.warden, status === "rejected" ? "Outpass requires a parent or registered guardian as escort." : null,
        ],
      );
      await q.query("INSERT INTO status_history (entity, entity_id, to_status, note, actor_id, actor_label) VALUES ('leave',$1,'pending','Request submitted',$2,$3)", [
        lid, by, by === userIds.parent ? "Sunita Devi (parent)" : "Manoj Oraon (entered for parent)",
      ]);
      if (status !== "pending") {
        await q.query("INSERT INTO status_history (entity, entity_id, from_status, to_status, actor_id, actor_label) VALUES ('leave',$1,'pending',$2,$3,'Manoj Oraon')", [
          lid, status === "rejected" ? "rejected" : "approved", userIds.warden,
        ]);
      }
    }
    for (let d = 7; d >= 1; d--) {
      const date = addDays(today, -d);
      for (const s of boarders) {
        for (const session of ["morning", "night"]) {
          const status = rand() < 0.03 ? "on_leave" : rand() < 0.01 ? "absent" : "present";
          await q.query("INSERT INTO hostel_attendance (student_id, date, session, status, marked_by, seeded) VALUES ($1,$2,$3,$4,$5,TRUE)", [s.id, date, session, status, userIds.warden]);
        }
      }
    }
    const rooms = await q.query<{ id: number; room_no: string }>("SELECT id, room_no FROM hostel_rooms ORDER BY id");
    const maint = [
      [rooms[0].id, "electrical", "Tube light flickering near study table", "normal", "open"],
      [rooms[2].id, "plumbing", "Washroom tap leaking", "urgent", "in_progress"],
      [rooms[7].id, "furniture", "Broken cupboard hinge", "low", "resolved"],
      [rooms[8].id, "cleaning", "Window mesh needs cleaning", "low", "closed"],
      [rooms[4].id, "electrical", "Ceiling fan regulator not working", "normal", "open"],
    ] as const;
    for (const [roomId, category, description, priority, status] of maint) {
      const mid = await id(
        "INSERT INTO maintenance_requests (room_id, raised_by, category, description, priority, status, assigned_to, seeded) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id",
        [roomId, userIds.warden, category, description, priority, status, status === "open" ? null : "Campus maintenance team"],
      );
      await q.query("INSERT INTO status_history (entity, entity_id, to_status, note, actor_label) VALUES ('maintenance',$1,'open','Request raised','Manoj Oraon')", [mid]);
    }

    // ── Coding ──────────────────────────────────────────────────────────
    let lp = 0;
    for (const lesson of CODING_LESSONS) {
      const lessonId = await id("INSERT INTO coding_lessons (track, slug, title, level, body, position) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [
        lesson.track, lesson.slug, lesson.title, lesson.level, lesson.body, lp++,
      ]);
      for (const c of lesson.challenges) {
        await q.query("INSERT INTO coding_challenges (lesson_id, slug, title, kind, prompt, starter, spec, hint) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [
          lessonId, c.slug, c.title, c.kind, c.prompt, c.starter, JSON.stringify(c.spec), c.hint,
        ]);
      }
    }
    for (const p of PROJECTS) {
      await q.query("INSERT INTO projects (track, title, brief, deliverables, hardware_needed) VALUES ($1,$2,$3,$4,$5)", [p.track, p.title, p.brief, p.deliverables, p.hardware_needed]);
    }
    for (const slug of ["py-greeting", "ai-check-1"]) {
      await q.query(
        "INSERT INTO coding_progress (student_id, challenge_id, status, verified_by) SELECT $1, id, 'passed', CASE WHEN kind = 'mcq' THEN 'server' ELSE 'client_tests' END FROM coding_challenges WHERE slug = $2",
        [aarav.id, slug],
      );
    }

    await q.query("INSERT INTO audit_log (action, detail) VALUES ('system.seed', $1)", [JSON.stringify({ note: "Synthetic presentation data loaded" })]);
  });
}

/** Removes every row (used by "reset presentation data" and tests). Schema is kept. */
export async function wipeDatabase(q: Queryable) {
  await q.query(`TRUNCATE audit_log, coding_progress, coding_challenges, coding_lessons, projects, status_history, maintenance_requests,
    hostel_attendance, leave_requests, bed_allocations, hostel_beds, hostel_rooms, assistant_logs, enquiries, kb_entries, tasks, marks, exams,
    attendance, learning_events, lesson_plans, worksheets, quiz_attempts, quiz_questions, quizzes, questions, materials, topics,
    teaching_assignments, subjects, sessions, users, students, classes RESTART IDENTITY CASCADE`);
}
