import { can, type Permission, type Role } from "./rbac";

export type NavItem = { href: string; label: string; icon: string; any: Permission[]; roles?: Role[] };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { label: "Overview", items: [{ href: "/app", label: "Dashboard", icon: "layout-dashboard", any: [] }] },
  {
    label: "Learning",
    items: [
      { href: "/app/learn", label: "Learn & practise", icon: "book-open", any: ["learning.use"], roles: ["student", "teacher", "platform_admin"] },
      { href: "/app/study", label: "AI study assistant", icon: "sparkles", any: ["learning.use"], roles: ["student", "teacher", "platform_admin"] },
      { href: "/app/progress", label: "Progress", icon: "trending-up", any: ["progress.view_own"] },
      { href: "/app/coding", label: "Coding, AI & robotics", icon: "cpu", any: ["coding.use"] },
    ],
  },
  {
    label: "Teaching",
    items: [
      { href: "/app/teacher", label: "Teacher workspace", icon: "presentation", any: ["content.manage"] },
      { href: "/app/teacher/content", label: "Learning material", icon: "file-text", any: ["content.manage", "content.approve"] },
      { href: "/app/teacher/questions", label: "Question bank", icon: "list-checks", any: ["content.manage", "content.approve"] },
      { href: "/app/teacher/quizzes", label: "Quizzes", icon: "clipboard-check", any: ["quiz.manage"] },
      { href: "/app/teacher/worksheets", label: "Worksheets", icon: "printer", any: ["content.manage"] },
      { href: "/app/teacher/lessons", label: "Lesson preparation", icon: "notebook-pen", any: ["ai.teacher_tools"] },
      { href: "/app/teacher/performance", label: "Class performance", icon: "bar-chart", any: ["performance.view"] },
    ],
  },
  {
    label: "Admissions",
    items: [
      { href: "/app/enquiries", label: "Enquiries", icon: "inbox", any: ["enquiry.manage"] },
      { href: "/app/knowledge", label: "Assistant knowledge base", icon: "library", any: ["kb.manage"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/app/students", label: "Student records", icon: "users", any: ["students.read"] },
      { href: "/app/attendance", label: "Attendance", icon: "calendar-check", any: ["attendance.mark"] },
      { href: "/app/exams", label: "Exams & marks", icon: "pen-line", any: ["marks.enter", "exams.manage"] },
      { href: "/app/report-cards", label: "Report cards", icon: "award", any: ["reportcards.view"] },
      { href: "/app/reports", label: "Reports", icon: "table", any: ["reports.view"] },
      { href: "/app/tasks", label: "Tasks", icon: "check-square", any: ["tasks.manage"] },
    ],
  },
  {
    label: "Hostel",
    items: [
      { href: "/app/hostel", label: "Hostel overview", icon: "building", any: ["hostel.view", "hostel.manage"] },
      { href: "/app/hostel/leave", label: "Leave & outpass", icon: "door-open", any: ["hostel.manage", "hostel.request"] },
      { href: "/app/hostel/rollcall", label: "Roll-call", icon: "clipboard-list", any: ["hostel.manage"] },
      { href: "/app/hostel/rooms", label: "Rooms & beds", icon: "bed", any: ["hostel.manage"] },
      { href: "/app/hostel/maintenance", label: "Maintenance", icon: "wrench", any: ["hostel.manage"], roles: ["warden", "platform_admin", "student"] },
    ],
  },
  { label: "Management", items: [{ href: "/app/command", label: "Command centre", icon: "gauge", any: ["command.view"] }] },
  {
    label: "Platform",
    items: [
      { href: "/app/users", label: "Users & roles", icon: "user-cog", any: ["users.manage"] },
      { href: "/app/audit", label: "Audit log", icon: "scroll-text", any: ["audit.view"] },
      { href: "/app/system", label: "System & AI status", icon: "settings", any: ["users.manage"] },
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

/** Menu labels a role can open, so AI answers can name only real pages. */
export function menuNames(role: Role): string[] {
  return [...navFor(role).flatMap((g) => g.items.map((i) => i.label)), "User guides"];
}
