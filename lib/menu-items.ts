import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  NotebookPen,
  ClipboardCheck,
  UserCheck,
  ClipboardList,
  Wallet,
  TrendingUp,
  BookMarked,
  Truck,
  Megaphone,
  CalendarClock,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/lib/permissions"

export type SidebarLink = {
  label: string
  href: string
  permission: Permission
}

export type SidebarModule = {
  icon: LucideIcon
  label: string
  permission: Permission
  links: SidebarLink[]
}

export const sidebarModules: SidebarModule[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    permission: "settings.view",
    links: [{ label: "Dashboard", href: "/dashboard", permission: "settings.view" }],
  },
  {
    icon: School,
    label: "School Management",
    permission: "schools.view",
    links: [
      { label: "Schools", href: "/dashboard/schools", permission: "schools.view" },
      { label: "Branches", href: "/dashboard/branches", permission: "branches.view" },
      { label: "Sessions", href: "/dashboard/sessions", permission: "sessions.view" },
      { label: "Users", href: "/dashboard/users", permission: "settings.view" },
      { label: "Audit Logs", href: "/dashboard/audit-logs", permission: "audit.view" },
    ],
  },
  {
    icon: Users,
    label: "Student Information",
    permission: "students.view",
    links: [
      { label: "Students", href: "/dashboard/students", permission: "students.view" },
      { label: "Admissions", href: "/dashboard/admissions", permission: "students.view" },
      { label: "ID Cards", href: "/dashboard/students/id-cards", permission: "students.view" },
      { label: "Parents", href: "/dashboard/parents", permission: "parents.view" },
      { label: "Alumni", href: "/dashboard/alumni", permission: "students.view" },
    ],
  },
  {
    icon: GraduationCap,
    label: "Academics",
    permission: "classes.view",
    links: [
      { label: "Classes", href: "/dashboard/classes", permission: "classes.view" },
      { label: "Subjects", href: "/dashboard/subjects", permission: "classes.view" },
      { label: "Teachers", href: "/dashboard/teachers", permission: "teachers.view" },
      { label: "Class Timetable", href: "/dashboard/timetable", permission: "classes.view" },
      { label: "Workload", href: "/dashboard/workload", permission: "workload.view" },
    ],
  },
  {
    icon: NotebookPen,
    label: "Homework",
    permission: "homework.view",
    links: [
      { label: "Homework", href: "/dashboard/homework", permission: "homework.view" },
      { label: "Submissions", href: "/dashboard/homework/submissions", permission: "homework.view" },
      { label: "Check & Grade", href: "/dashboard/homework/check", permission: "homework.view" },
    ],
  },
  {
    icon: ClipboardCheck,
    label: "Attendance",
    permission: "attendance.view",
    links: [
      { label: "Mark Attendance", href: "/dashboard/attendance", permission: "attendance.view" },
      { label: "Attendance History", href: "/dashboard/attendance/history", permission: "attendance.view" },
      { label: "QR Cards", href: "/dashboard/attendance/qr-cards", permission: "attendance.view" },
      { label: "QR Scan", href: "/dashboard/attendance/scan", permission: "attendance.view" },
      { label: "Staff Attendance", href: "/dashboard/staff-attendance", permission: "attendance.view" },
      { label: "Approve Leave", href: "/dashboard/leaves", permission: "attendance.view" },
    ],
  },
  {
    icon: ClipboardList,
    label: "Examinations",
    permission: "exams.view",
    links: [
      { label: "Exams", href: "/dashboard/exams", permission: "exams.view" },
      { label: "Exam Types", href: "/dashboard/exams/exam-types", permission: "exams.view" },
      { label: "Exam Schedule", href: "/dashboard/exams/schedule", permission: "exams.view" },
      { label: "Marks Entry", href: "/dashboard/exams/marks-entry", permission: "exams.marks_entry" },
      { label: "Results", href: "/dashboard/exams/results", permission: "exams.view" },
      { label: "Report Cards", href: "/dashboard/exams/report-cards", permission: "exams.report_cards" },
      { label: "Online Exams", href: "/dashboard/exams/online", permission: "exams.view" },
      { label: "Question Bank", href: "/dashboard/exams/question-bank", permission: "exams.view" },
      { label: "Assignments", href: "/dashboard/assignments", permission: "homework.view" },
    ],
  },
  {
    icon: Wallet,
    label: "Fees Collection",
    permission: "fees.view",
    links: [
      { label: "Fee Structures", href: "/dashboard/fees/fee-structures", permission: "fees.view" },
      { label: "Invoices", href: "/dashboard/fees/invoices", permission: "fees.invoices" },
      { label: "Payments", href: "/dashboard/fees/payments", permission: "fees.collect" },
      { label: "Defaulters", href: "/dashboard/fees/defaulters", permission: "fees.defaulters" },
      { label: "Collection Report", href: "/dashboard/fees/collection-report", permission: "fees.view" },
    ],
  },
  {
    icon: TrendingUp,
    label: "Income & Expenses",
    permission: "expenses.view",
    links: [{ label: "Expenses", href: "/dashboard/expenses", permission: "expenses.view" }],
  },
  {
    icon: UserCheck,
    label: "Human Resource",
    permission: "staff.view",
    links: [{ label: "Staff Directory", href: "/dashboard/staff", permission: "staff.view" }],
  },
  {
    icon: BookMarked,
    label: "Library",
    permission: "library.view",
    links: [
      { label: "Book List", href: "/dashboard/library", permission: "library.view" },
      { label: "Issue & Return", href: "/dashboard/library/issues", permission: "library.manage" },
    ],
  },
  {
    icon: Truck,
    label: "Transport",
    permission: "transport.view",
    links: [
      { label: "Routes", href: "/dashboard/transport/routes", permission: "transport.view" },
      { label: "Vehicles", href: "/dashboard/transport/vehicles", permission: "transport.view" },
      { label: "Student Assignment", href: "/dashboard/transport/assignments", permission: "transport.manage" },
    ],
  },
  {
    icon: Megaphone,
    label: "Communication",
    permission: "announcements.view",
    links: [
      { label: "Announcements", href: "/dashboard/announcements", permission: "announcements.view" },
      { label: "Messages", href: "/dashboard/messages", permission: "messages.view" },
      { label: "Notifications", href: "/dashboard/notifications", permission: "notifications.view" },
    ],
  },
  {
    icon: CalendarClock,
    label: "Events & Meetings",
    permission: "meetings.view",
    links: [
      { label: "Meetings", href: "/dashboard/meetings", permission: "meetings.view" },
      { label: "Events", href: "/dashboard/events", permission: "events.view" },
      { label: "Annual Calendar", href: "/dashboard/calendar", permission: "calendar.view" },
    ],
  },
  {
    icon: BarChart3,
    label: "Reports",
    permission: "reports.view",
    links: [
      { label: "All Reports", href: "/dashboard/reports", permission: "reports.view" },
      { label: "Attendance Report", href: "/dashboard/reports/attendance", permission: "reports.view" },
      { label: "Fee Collection", href: "/dashboard/reports/fee-collection", permission: "reports.view" },
      { label: "Fee Defaulters", href: "/dashboard/reports/fee-defaulters", permission: "reports.view" },
      { label: "Exam Performance", href: "/dashboard/reports/exam-performance", permission: "reports.view" },
      { label: "Enrollment", href: "/dashboard/reports/enrollment", permission: "reports.view" },
      { label: "Admissions", href: "/dashboard/reports/admissions", permission: "reports.view" },
      { label: "Income & Expense", href: "/dashboard/reports/income-expense", permission: "reports.view" },
      { label: "Expenses", href: "/dashboard/reports/expenses", permission: "reports.view" },
    ],
  },
  {
    icon: Settings,
    label: "System Settings",
    permission: "settings.view",
    links: [{ label: "Settings", href: "/dashboard/settings", permission: "settings.view" }],
  },
]

export function filterModulesByPermissions(
  modules: SidebarModule[],
  userPermissions: string[],
): SidebarModule[] {
  const granted = new Set(userPermissions)
  return modules
    .map((module) => ({
      ...module,
      links: module.links.filter((link) => granted.has(link.permission)),
    }))
    .filter((module) => granted.has(module.permission) && module.links.length > 0)
}

export function getAllMenuHrefs(modules: SidebarModule[]): string[] {
  return modules.flatMap((m) => m.links.map((l) => l.href))
}

export function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

export function resolveActiveHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null
  for (const href of hrefs) {
    if (!isPathActive(pathname, href)) continue
    if (best === null || href.length > best.length) best = href
  }
  return best
}

export function findModuleForPath(
  pathname: string,
  modules: SidebarModule[],
): SidebarModule | undefined {
  return modules.find((m) => m.links.some((l) => isPathActive(pathname, l.href)))
}

export type MenuItem = {
  title: string
  href: string
  icon: LucideIcon
  permission: Permission
}

export const menuItems: MenuItem[] = sidebarModules.flatMap((module) =>
  module.links.map((link) => ({
    title: link.label,
    href: link.href,
    icon: module.icon,
    permission: link.permission,
  })),
)

export function filterMenuItemsByPermissions(
  items: MenuItem[],
  userPermissions: string[],
): MenuItem[] {
  const granted = new Set(userPermissions)
  return items.filter((item) => granted.has(item.permission))
}
