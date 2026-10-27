import { can, type Permission, type Role } from "./rbac";

export type NavItem = { href: string; label: string; any: Permission[]; roles?: Role[] };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { label: "Overview", items: [{ href: "/app", label: "Dashboard", any: [] }] },
  {
    label: "Learning",
    items: [
      { href: "/app/learn", label: "Learn & practise", any: ["learning.use"], roles: ["student", "teacher", "platform_admin"] },
      { href: "/app/progress", label: "Progress", any: ["progress.view_own"] },
      { href: "/app/coding", label: "Coding, AI & robotics", any: ["coding.use"] },
    ],
  },
  {
    label: "Teaching",
    items: [
      { href: "/app/teacher", label: "Teacher workspace", any: ["content.manage"] },
      { href: "/app/teacher/content", label: "Learning material", any: ["content.manage", "content.approve"] },
      { href: "/app/teacher/questions", label: "Question bank", any: ["content.manage", "content.approve"] },
      { href: "/app/teacher/quizzes", label: "Quizzes", any: ["quiz.manage"] },
      { href: "/app/teacher/worksheets", label: "Worksheets", any: ["content.manage"] },
      { href: "/app/teacher/lessons", label: "Lesson preparation", any: ["ai.teacher_tools"] },
      { href: "/app/teacher/performance", label: "Class performance", any: ["performance.view"] },
    ],
  },
  {
    label: "Admissions",
    items: [
      { href: "/app/enquiries", label: "Enquiries", any: ["enquiry.manage"] },
      { href: "/app/knowledge", label: "Assistant knowledge base", any: ["kb.manage"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/app/students", label: "Student records", any: ["students.read"] },
      { href: "/app/attendance", label: "Attendance", any: ["attendance.mark"] },
      { href: "/app/exams", label: "Exams & marks", any: ["marks.enter", "exams.manage"] },
      { href: "/app/report-cards", label: "Report cards", any: ["reportcards.view"] },
      { href: "/app/reports", label: "Reports", any: ["reports.view"] },
      { href: "/app/tasks", label: "Tasks", any: ["tasks.manage"] },
    ],
  },
  {
    label: "Hostel",
    items: [
      { href: "/app/hostel", label: "Hostel overview", any: ["hostel.view", "hostel.manage"] },
      { href: "/app/hostel/leave", label: "Leave & outpass", any: ["hostel.manage", "hostel.request"] },
      { href: "/app/hostel/rollcall", label: "Roll-call", any: ["hostel.manage"] },
      { href: "/app/hostel/rooms", label: "Rooms & beds", any: ["hostel.manage"] },
      { href: "/app/hostel/maintenance", label: "Maintenance", any: ["hostel.manage"], roles: ["warden", "platform_admin", "student"] },
    ],
  },
  { label: "Management", items: [{ href: "/app/command", label: "Command centre", any: ["command.view"] }] },
  {
    label: "Platform",
    items: [
      { href: "/app/users", label: "Users & roles", any: ["users.manage"] },
      { href: "/app/audit", label: "Audit log", any: ["audit.view"] },
      { href: "/app/system", label: "System & AI status", any: ["users.manage"] },
    ],
  },
];

/** An explicit role list decides on its own; otherwise any one of the listed permissions grants the item. */
export function navVisible(item: NavItem, role: Role) {
  if (item.roles) return item.roles.includes(role);
  return item.any.length === 0 || item.any.some((p) => can(role, p));
}

export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => navVisible(i, role)) })).filter((g) => g.items.length > 0);
}
