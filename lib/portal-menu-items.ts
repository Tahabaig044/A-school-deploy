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
  ClipboardList,
  Bell,
  UserCheck,
  User,
  Table,
  Award,
  BookMarked,
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
    title: "My Results",
    href: "/portal/student/results",
    icon: Award,
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
    title: "Timetable",
    href: "/portal/student/timetable",
    icon: Table,
    roles: ["STUDENT"],
  },
  {
    title: "Leave Requests",
    href: "/portal/student/leave-requests",
    icon: UserCheck,
    roles: ["STUDENT"],
  },
  {
    title: "Messages",
    href: "/portal/student/messages",
    icon: MessageSquare,
    roles: ["STUDENT"],
  },
  {
    title: "Profile",
    href: "/portal/student/profile",
    icon: User,
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
    title: "Attendance",
    href: "/portal/parent/attendance",
    icon: ClipboardCheck,
    roles: ["PARENT"],
  },
  {
    title: "Fee Status",
    href: "/portal/parent/fees",
    icon: DollarSign,
    roles: ["PARENT"],
  },
  {
    title: "Results",
    href: "/portal/parent/results",
    icon: GraduationCap,
    roles: ["PARENT"],
  },
  {
    title: "Homework",
    href: "/portal/parent/homework",
    icon: CalendarClock,
    roles: ["PARENT"],
  },
  {
    title: "Notices",
    href: "/portal/parent/notices",
    icon: Bell,
    roles: ["PARENT"],
  },
  {
    title: "Leave Requests",
    href: "/portal/parent/leave-requests",
    icon: UserCheck,
    roles: ["PARENT"],
  },
  {
    title: "Profile",
    href: "/portal/parent/profile",
    icon: User,
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
    title: "Attendance",
    href: "/portal/teacher/attendance",
    icon: ClipboardCheck,
    roles: ["TEACHER"],
  },
  {
    title: "Marks",
    href: "/portal/teacher/marks",
    icon: Award,
    roles: ["TEACHER"],
  },
  {
    title: "Homework",
    href: "/portal/teacher/homework",
    icon: CalendarClock,
    roles: ["TEACHER"],
  },
  {
    title: "Timetable",
    href: "/portal/teacher/timetable",
    icon: Table,
    roles: ["TEACHER"],
  },
  {
    title: "Leave Requests",
    href: "/portal/teacher/leave-requests",
    icon: UserCheck,
    roles: ["TEACHER"],
  },
  {
    title: "Profile",
    href: "/portal/teacher/profile",
    icon: User,
    roles: ["TEACHER"],
  },
]

export function getPortalMenuItemsForRole(role: Role): PortalMenuItem[] {
  return portalMenuItems.filter((item) => item.roles.includes(role))
}
