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
  Megaphone,
  Settings,
  Calendar,
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
    title: "Events",
    href: "/dashboard/events",
    icon: Megaphone,
    roles: ["STUDENT"],
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
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
    title: "Timetable",
    href: "/portal/parent/timetable",
    icon: Calendar,
    roles: ["PARENT"],
  },
  {
    title: "Notices",
    href: "/portal/parent/notices",
    icon: Bell,
    roles: ["PARENT"],
  },
  {
    title: "Meetings",
    href: "/portal/parent/meetings",
    icon: CalendarClock,
    roles: ["PARENT"],
  },
  {
    title: "Events",
    href: "/dashboard/events",
    icon: Megaphone,
    roles: ["PARENT"],
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    roles: ["PARENT"],
  },
  {
    title: "Messages",
    href: "/portal/parent/messages",
    icon: MessageSquare,
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
    title: "My Students",
    href: "/portal/teacher/students",
    icon: Users,
    roles: ["TEACHER"],
  },
  {
    title: "Attendance",
    href: "/portal/teacher/attendance",
    icon: ClipboardCheck,
    roles: ["TEACHER"],
  },
  {
    title: "Assignments",
    href: "/portal/teacher/assignments",
    icon: CalendarClock,
    roles: ["TEACHER"],
  },
  {
    title: "Exams",
    href: "/portal/teacher/exams",
    icon: ClipboardList,
    roles: ["TEACHER"],
  },
  {
    title: "Marks",
    href: "/portal/teacher/marks",
    icon: Award,
    roles: ["TEACHER"],
  },
  {
    title: "Timetable",
    href: "/portal/teacher/timetable",
    icon: Table,
    roles: ["TEACHER"],
  },
  {
    title: "Homework",
    href: "/portal/teacher/homework",
    icon: BookOpen,
    roles: ["TEACHER"],
  },
  {
    title: "Announcements",
    href: "/portal/teacher/announcements",
    icon: Megaphone,
    roles: ["TEACHER"],
  },
  {
    title: "Messages",
    href: "/portal/teacher/messages",
    icon: MessageSquare,
    roles: ["TEACHER"],
  },
  {
    title: "Meetings",
    href: "/portal/teacher/meetings",
    icon: CalendarClock,
    roles: ["TEACHER"],
  },
  {
    title: "Events",
    href: "/dashboard/events",
    icon: Megaphone,
    roles: ["TEACHER"],
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
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
  {
    title: "Settings",
    href: "/portal/teacher/settings",
    icon: Settings,
    roles: ["TEACHER"],
  },
]

export function getPortalMenuItemsForRole(role: Role): PortalMenuItem[] {
  return portalMenuItems.filter((item) => item.roles.includes(role))
}
