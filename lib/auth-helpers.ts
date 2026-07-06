import type { Role } from "@/lib/constants"

const ROLE_REDIRECTS: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard",
  SCHOOL_ADMIN: "/dashboard",
  BRANCH_ADMIN: "/dashboard",
  PRINCIPAL: "/dashboard",
  TEACHER: "/portal/teacher",
  STUDENT: "/portal/student",
  PARENT: "/portal/parent",
  ACCOUNTANT: "/dashboard",
  ADMISSION_OFFICER: "/dashboard",
  LIBRARIAN: "/dashboard",
  TRANSPORT_MANAGER: "/dashboard",
}

export function getRedirectPath(role: Role): string {
  return ROLE_REDIRECTS[role] || "/dashboard"
}
