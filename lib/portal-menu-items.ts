import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  CalendarClock,
  GraduationCap,
  DollarSign,
  MessageSquare,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/lib/constants"

export type PortalMenuItem = {
  title: string
  href: string
  icon: LucideIcon
  roles: Role[]
}

export const portalMenuItems: PortalMenuItem[] = [
  // Student portal
  {
    title: "Dashboard",
    href: "/portal/student",
    icon: LayoutDashboard,
    roles: ["STUDENT"],
  },
  {
    title: "My Attendance",
    href: "/portal/student/attendance",
    icon: ClipboardCheck,
    roles: ["STUDENT"],
  },
  {
    title: "My Exams",
    href: "/portal/student/exams",
    icon: FileText,
    roles: ["STUDENT"],
  },
  {
    title: "My Fees",
    href: "/portal/student/fees",
    icon: DollarSign,
    roles: ["STUDENT"],
  },
  {
    title: "Homework",
    href: "/portal/student/homework",
    icon: CalendarClock,
    roles: ["STUDENT"],
  },
  {
    title: "Messages",
    href: "/portal/student/messages",
    icon: MessageSquare,
    roles: ["STUDENT"],
  },

  // Parent portal
  {
    title: "Dashboard",
    href: "/portal/parent",
    icon: LayoutDashboard,
    roles: ["PARENT"],
  },
  {
    title: "My Children",
    href: "/portal/parent/children",
    icon: Users,
    roles: ["PARENT"],
  },
  {
    title: "Fee Status",
    href: "/portal/parent/fees",
    icon: DollarSign,
    roles: ["PARENT"],
  },
  {
    title: "Announcements",
    href: "/portal/parent/announcements",
    icon: FileText,
    roles: ["PARENT"],
  },
  {
    title: "Messages",
    href: "/portal/parent/messages",
    icon: MessageSquare,
    roles: ["PARENT"],
  },

  // Teacher portal
  {
    title: "Dashboard",
    href: "/portal/teacher",
    icon: LayoutDashboard,
    roles: ["TEACHER"],
  },
  {
    title: "My Classes",
    href: "/portal/teacher/classes",
    icon: GraduationCap,
    roles: ["TEACHER"],
  },
  {
    title: "Mark Attendance",
    href: "/portal/teacher/attendance",
    icon: ClipboardCheck,
    roles: ["TEACHER"],
  },
  {
    title: "Homework",
    href: "/portal/teacher/homework",
    icon: CalendarClock,
    roles: ["TEACHER"],
  },
  {
    title: "My Students",
    href: "/portal/teacher/students",
    icon: Users,
    roles: ["TEACHER"],
  },
  {
    title: "Messages",
    href: "/portal/teacher/messages",
    icon: MessageSquare,
    roles: ["TEACHER"],
  },
]

export function getPortalMenuItemsForRole(role: Role): PortalMenuItem[] {
  return portalMenuItems.filter((item) => item.roles.includes(role))
}
