import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/constants"

const ALL_PERMISSIONS = [
  // Students
  "students.view",
  "students.create",
  "students.edit",
  "students.delete",
  // Teachers
  "teachers.view",
  "teachers.create",
  "teachers.edit",
  "teachers.delete",
  // Classes
  "classes.view",
  "classes.create",
  "classes.edit",
  "classes.delete",
  // Attendance
  "attendance.view",
  "attendance.mark",
  // Exams
  "exams.view",
  "exams.create",
  "exams.edit",
  "exams.delete",
  "exams.marks_entry",
  "exams.report_cards",
  // Fees
  "fees.view",
  "fees.create",
  "fees.edit",
  "fees.delete",
  "fees.collect",
  "fees.invoices",
  "fees.defaulters",
  // Homework
  "homework.view",
  "homework.create",
  "homework.edit",
  "homework.delete",
  // Library
  "library.view",
  "library.manage",
  // Transport
  "transport.view",
  "transport.manage",
  // Announcements
  "announcements.view",
  "announcements.create",
  "announcements.edit",
  // Messages
  "messages.view",
  "messages.send",
  // Reports
  "reports.view",
  "reports.export",
  // Settings
  "settings.view",
  "settings.edit",
  // Branches
  "branches.view",
  "branches.create",
  "branches.edit",
  // Schools
  "schools.view",
  "schools.create",
  "schools.edit",
  // Staff
  "staff.view",
  "staff.create",
  "staff.edit",
  // Sessions
  "sessions.view",
  "sessions.create",
  "sessions.edit",
  // Audit
  "audit.view",
  // Expenses
  "expenses.view",
  "expenses.create",
  "expenses.edit",
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]

const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  SCHOOL_ADMIN: [
    "students.view", "students.create", "students.edit", "students.delete",
    "teachers.view", "teachers.create", "teachers.edit", "teachers.delete",
    "classes.view", "classes.create", "classes.edit", "classes.delete",
    "attendance.view", "attendance.mark",
    "exams.view", "exams.create", "exams.edit", "exams.delete", "exams.marks_entry", "exams.report_cards",
    "fees.view", "fees.create", "fees.edit", "fees.delete", "fees.collect", "fees.invoices", "fees.defaulters",
    "homework.view", "homework.create", "homework.edit", "homework.delete",
    "library.view", "library.manage",
    "transport.view", "transport.manage",
    "announcements.view", "announcements.create", "announcements.edit",
    "messages.view", "messages.send",
    "reports.view", "reports.export",
    "settings.view", "settings.edit",
    "branches.view", "branches.create", "branches.edit",
    "staff.view", "staff.create", "staff.edit",
    "sessions.view", "sessions.create", "sessions.edit",
    "expenses.view", "expenses.create", "expenses.edit",
  ],
  BRANCH_ADMIN: [
    "students.view", "students.create", "students.edit",
    "teachers.view", "teachers.create", "teachers.edit",
    "classes.view", "classes.create", "classes.edit",
    "attendance.view", "attendance.mark",
    "exams.view", "exams.create", "exams.edit", "exams.marks_entry", "exams.report_cards",
    "fees.view", "fees.create", "fees.edit", "fees.collect", "fees.invoices", "fees.defaulters",
    "homework.view", "homework.create", "homework.edit",
    "library.view",
    "transport.view",
    "announcements.view", "announcements.create",
    "messages.view", "messages.send",
    "reports.view",
    "staff.view", "staff.create", "staff.edit",
    "expenses.view", "expenses.create",
  ],
  PRINCIPAL: [
    "students.view", "students.create", "students.edit",
    "teachers.view", "teachers.create", "teachers.edit",
    "classes.view", "classes.create", "classes.edit",
    "attendance.view", "attendance.mark",
    "exams.view", "exams.create", "exams.edit", "exams.marks_entry", "exams.report_cards",
    "fees.view",
    "homework.view", "homework.create", "homework.edit",
    "announcements.view", "announcements.create",
    "messages.view", "messages.send",
    "reports.view",
  ],
  TEACHER: [
    "students.view",
    "classes.view",
    "attendance.view", "attendance.mark",
    "exams.view", "exams.marks_entry", "exams.report_cards",
    "homework.view", "homework.create", "homework.edit",
    "messages.view", "messages.send",
  ],
  ACCOUNTANT: [
    "fees.view", "fees.create", "fees.edit", "fees.collect", "fees.invoices", "fees.defaulters",
    "expenses.view", "expenses.create", "expenses.edit",
    "reports.view", "reports.export",
    "students.view",
  ],
  ADMISSION_OFFICER: [
    "students.view", "students.create", "students.edit",
    "announcements.view",
    "messages.view", "messages.send",
  ],
  LIBRARIAN: [
    "library.view", "library.manage",
    "students.view",
  ],
  TRANSPORT_MANAGER: [
    "transport.view", "transport.manage",
    "students.view",
  ],
  PARENT: [
    "students.view",
    "fees.view",
    "homework.view",
    "announcements.view",
    "messages.view", "messages.send",
    "exams.view", "exams.report_cards",
    "attendance.view",
  ],
  STUDENT: [
    "students.view",
    "fees.view",
    "homework.view",
    "announcements.view",
    "messages.view",
    "exams.view", "exams.report_cards",
    "attendance.view",
    "classes.view",
  ],
}

// In-memory cache for permissions (reset on server restart)
let permissionsCache: Map<string, Set<string>> | null = null

async function loadPermissionsCache(): Promise<Map<string, Set<string>>> {
  if (permissionsCache) return permissionsCache

  const rolePerms = await prisma.rolePermission.findMany({
    include: { permission: true },
  })

  const userPerms = await prisma.userPermission.findMany({
    where: { granted: true },
    include: { permission: true },
  })

  const cache = new Map<string, Set<string>>()

  // Load role-based permissions
  for (const rp of rolePerms) {
    const key = `role:${rp.role}`
    if (!cache.has(key)) cache.set(key, new Set())
    cache.get(key)!.add(`${rp.permission.resource}.${rp.permission.action}`)
  }

  // Load user-specific permissions
  for (const up of userPerms) {
    const key = `user:${up.profileId}`
    if (!cache.has(key)) cache.set(key, new Set())
    cache.get(key)!.add(`${up.permission.resource}.${up.permission.action}`)
  }

  permissionsCache = cache
  return cache
}

export function resetPermissionsCache() {
  permissionsCache = null
}

export async function can(
  profileId: string,
  role: Role,
  permission: Permission
): Promise<boolean> {
  const cache = await loadPermissionsCache()

  // Check user-specific permissions first (overrides role)
  const userKey = `user:${profileId}`
  const userPerms = cache.get(userKey)
  if (userPerms) {
    if (userPerms.has(permission)) return true
  }

  // Check role-based permissions
  const roleKey = `role:${role}`
  const rolePerms = cache.get(roleKey)
  if (rolePerms) {
    return rolePerms.has(permission)
  }

  // Fallback to hardcoded defaults if no DB records
  const defaults = ROLE_DEFAULTS[role]
  return defaults ? defaults.includes(permission as Permission) : false
}

export async function canAny(
  profileId: string,
  role: Role,
  permissions: Permission[]
): Promise<boolean> {
  for (const p of permissions) {
    if (await can(profileId, role, p)) return true
  }
  return false
}

export async function getPermissionsForRole(role: Role): Promise<string[]> {
  const cache = await loadPermissionsCache()
  const roleKey = `role:${role}`
  const perms = cache.get(roleKey)
  if (perms) return Array.from(perms)

  // Fallback to defaults
  return ROLE_DEFAULTS[role] || []
}

export function getDefaultPermissions(): typeof ROLE_DEFAULTS {
  return ROLE_DEFAULTS
}

export { ALL_PERMISSIONS }
