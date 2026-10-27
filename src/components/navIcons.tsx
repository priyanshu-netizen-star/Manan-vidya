import {
  Award, BarChart3, BedDouble, BookOpen, Building2, CalendarCheck, CheckSquare, ClipboardCheck, ClipboardList, Cpu, DoorOpen,
  FileText, Gauge, Inbox, LayoutDashboard, Library, ListChecks, NotebookPen, PenLine, Presentation, Printer, ScrollText,
  Settings, Sparkles, Table2, TrendingUp, UserCog, Users, Wrench, type LucideIcon,
} from "lucide-react";

/** Icon for each navigation item (keyed by the `icon` name in src/lib/nav.ts). */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, "book-open": BookOpen, sparkles: Sparkles, "trending-up": TrendingUp, cpu: Cpu,
  presentation: Presentation, "file-text": FileText, "list-checks": ListChecks, "clipboard-check": ClipboardCheck, printer: Printer,
  "notebook-pen": NotebookPen, "bar-chart": BarChart3, inbox: Inbox, library: Library, users: Users, "calendar-check": CalendarCheck,
  "pen-line": PenLine, award: Award, table: Table2, "check-square": CheckSquare, building: Building2, "door-open": DoorOpen,
  "clipboard-list": ClipboardList, bed: BedDouble, wrench: Wrench, gauge: Gauge, "user-cog": UserCog, "scroll-text": ScrollText, settings: Settings,
};
