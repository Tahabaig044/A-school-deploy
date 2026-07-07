import {
  LayoutDashboard,
  School,
  Building2,
  CalendarDays,
  Settings,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarClock,
  Table2,
  ClipboardCheck,
  UserCheck,
  LogOut,
  DollarSign,
  Wallet,
  UserPlus,
  BookMarked,
  Bus,
  Megaphone,
  FileText,
  UserPlus2,
  type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/lib/permissions"

export type MenuItem = {
  title: string
  href: string
  icon: LucideIcon
  permission: Permission
}

export const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "settings.view",
  },
  {
    title: "Schools",
    href: "/dashboard/schools",
    icon: School,
    permission: "schools.view",
  },
  {
    title: "Branches",
    href: "/dashboard/branches",
    icon: Building2,
    permission: "branches.view",
  },
  {
    title: "Students",
    href: "/dashboard/students",
    icon: Users,
    permission: "students.view",
  },
  {
    title: "Admissions",
    href: "/dashboard/admissions",
    icon: UserPlus2,
    permission: "students.view",
  },
  {
    title: "Classes",
    href: "/dashboard/classes",
    icon: GraduationCap,
    permission: "classes.view",
  },
  {
    title: "Teachers",
    href: "/dashboard/teachers",
    icon: BookOpen,
    permission: "teachers.view",
  },
  {
    title: "Staff",
    href: "/dashboard/staff",
    icon: Users,
    permission: "staff.view",
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: UserPlus,
    permission: "settings.view",
  },
  {
    title: "Subjects",
    href: "/dashboard/subjects",
    icon: ClipboardList,
    permission: "classes.view",
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: ClipboardCheck,
    permission: "attendance.view",
  },
  {
    title: "Staff Attendance",
    href: "/dashboard/staff-attendance",
    icon: UserCheck,
    permission: "attendance.view",
  },
  {
    title: "Leaves",
    href: "/dashboard/leaves",
    icon: LogOut,
    permission: "attendance.view",
  },
  {
    title: "Exams",
    href: "/dashboard/exams",
    icon: ClipboardList,
    permission: "exams.view",
  },
  {
    title: "Assignments",
    href: "/dashboard/assignments",
    icon: CalendarClock,
    permission: "homework.view",
  },
  {
    title: "Fee Structures",
    href: "/dashboard/fees/fee-structures",
    icon: DollarSign,
    permission: "fees.view",
  },
  {
    title: "Invoices",
    href: "/dashboard/fees/invoices",
    icon: Wallet,
    permission: "fees.invoices",
  },
  {
    title: "Defaulters",
    href: "/dashboard/fees/defaulters",
    icon: LogOut,
    permission: "fees.defaulters",
  },
  {
    title: "Collection Report",
    href: "/dashboard/fees/collection-report",
    icon: ClipboardCheck,
    permission: "fees.view",
  },
  {
    title: "Expenses",
    href: "/dashboard/expenses",
    icon: Wallet,
    permission: "expenses.view",
  },
  {
    title: "Library",
    href: "/dashboard/library",
    icon: BookMarked,
    permission: "library.view",
  },
  {
    title: "Transport",
    href: "/dashboard/transport",
    icon: Bus,
    permission: "transport.view",
  },
  {
    title: "Announcements",
    href: "/dashboard/announcements",
    icon: Megaphone,
    permission: "announcements.view",
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    permission: "reports.view",
  },
  {
    title: "Timetable",
    href: "/dashboard/timetable",
    icon: Table2,
    permission: "classes.view",
  },
  {
    title: "Sessions",
    href: "/dashboard/sessions",
    icon: CalendarDays,
    permission: "sessions.view",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: "settings.view",
  },
]

export function filterMenuItemsByPermissions(
  items: MenuItem[],
  userPermissions: string[]
): MenuItem[] {
  return items.filter((item) => userPermissions.includes(item.permission))
}
