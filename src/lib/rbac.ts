/**
 * Role-based access control. This file is the single source of truth for who may do what;
 * every API route and protected page checks a permission from here on the server.
 * The same table is rendered in docs/05-roles-and-permissions.md.
 */

export const ROLES = ["student", "parent", "teacher", "office_admin", "warden", "management", "platform_admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  parent: "Parent / Guardian",
  teacher: "Teacher",
  office_admin: "Office & Admissions Staff",
  warden: "Hostel Warden",
  management: "Principal / Management",
  platform_admin: "VoxVision Platform Administrator",
};

export const PERMISSIONS = {
  "learning.use": "Use the AI learning platform and take quizzes",
  "coding.use": "Use coding, AI literacy and robotics activities",
  "progress.view_own": "See own (or own child's) learning progress",
  "content.manage": "Create and edit learning material, questions and worksheets",
  "content.approve": "Approve learning material and AI-drafted questions for student use",
  "quiz.manage": "Create, edit and publish quizzes",
  "performance.view": "View class quiz performance and topic summaries",
  "ai.teacher_tools": "Use AI lesson-preparation and question-drafting assistants",
  "enquiry.manage": "View and manage admission enquiries",
  "kb.manage": "Edit the admissions knowledge base",
  "students.read": "View student records",
  "students.write": "Create and edit student records",
  "attendance.mark": "Mark class attendance",
  "marks.enter": "Enter examination marks",
  "exams.manage": "Create and lock examinations",
  "reportcards.view": "View and print report cards",
  "reports.view": "View administrative reports",
  "tasks.manage": "Create and update administrative tasks",
  "hostel.request": "Submit leave / outpass and maintenance requests",
  "hostel.manage": "Manage rooms, beds, approvals, roll-call and maintenance",
  "hostel.view": "View hostel summaries",
  "command.view": "Open the management command centre",
  "users.manage": "Manage user accounts and roles",
  "audit.view": "View the audit log",
  "system.reset": "Reset presentation data (presentation environment only)",
} as const;
export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: ["learning.use", "coding.use", "progress.view_own", "hostel.request"],
  parent: ["progress.view_own", "hostel.request", "reportcards.view"],
  teacher: [
    "learning.use", "coding.use", "content.manage", "content.approve", "quiz.manage", "performance.view",
    "ai.teacher_tools", "students.read", "attendance.mark", "marks.enter", "reportcards.view", "tasks.manage",
  ],
  office_admin: [
    "enquiry.manage", "kb.manage", "students.read", "students.write", "attendance.mark", "exams.manage",
    "reportcards.view", "reports.view", "tasks.manage", "hostel.view",
  ],
  warden: ["hostel.manage", "hostel.view", "hostel.request", "students.read", "tasks.manage"],
  management: [
    "performance.view", "enquiry.manage", "students.read", "reportcards.view", "reports.view", "tasks.manage",
    "hostel.view", "command.view", "audit.view", "content.approve",
  ],
  platform_admin: ALL,
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Roles whose data scope is limited to a single linked student record. */
export function isStudentScoped(role: Role) {
  return role === "student" || role === "parent";
}
