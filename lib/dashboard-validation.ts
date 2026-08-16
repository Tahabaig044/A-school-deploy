import { prisma } from "@/lib/prisma"
import { getCurrentProfile, getCurrentUser } from "@/lib/auth"

export type ValidationResult = {
  valid: boolean
  user?: { id: string; email?: string }
  profile?: {
    id: string
    role: string
    schoolId: string | null
    branchId: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    isActive: boolean
    status: string
  }
  teacher?: { id: string; profileId: string | null }
  student?: { id: string; email: string | null }
  parent?: { id: string; email: string | null }
  error?: string
}

/**
 * Validate teacher portal access
 */
export async function validateTeacherPortal(): Promise<ValidationResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { valid: false, error: "Not authenticated" }
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    return { valid: false, error: "Profile not found" }
  }

  if (profile.role !== "TEACHER") {
    return { valid: false, error: "Access denied" }
  }

  if (profile.status !== "ACTIVE" || !profile.isActive) {
    return { valid: false, error: "Account is not active" }
  }

  const teacher = await prisma.teacher.findFirst({
    where: { profileId: user.id },
    select: { id: true, profileId: true },
  })

  if (!teacher) {
    return { valid: false, error: "Teacher record not found. Please contact administration." }
  }

  return { valid: true, user, profile, teacher }
}

/**
 * Validate student portal access
 */
export async function validateStudentPortal(): Promise<ValidationResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { valid: false, error: "Not authenticated" }
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    return { valid: false, error: "Profile not found" }
  }

  if (profile.role !== "STUDENT") {
    return { valid: false, error: "Access denied" }
  }

  if (profile.status !== "ACTIVE" || !profile.isActive) {
    return { valid: false, error: "Account is not active" }
  }

  const student = await prisma.student.findFirst({
    where: { email: profile.email! },
    select: { id: true, email: true },
  })

  if (!student) {
    return { valid: false, error: "Student record not found. Please contact administration." }
  }

  return { valid: true, user, profile, student }
}

/**
 * Validate parent portal access
 */
export async function validateParentPortal(): Promise<ValidationResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { valid: false, error: "Not authenticated" }
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    return { valid: false, error: "Profile not found" }
  }

  if (profile.role !== "PARENT") {
    return { valid: false, error: "Access denied" }
  }

  if (profile.status !== "ACTIVE" || !profile.isActive) {
    return { valid: false, error: "Account is not active" }
  }

  const parent = await prisma.parent.findFirst({
    where: { email: profile.email! },
    select: { id: true, email: true },
  })

  if (!parent) {
    return { valid: false, error: "Parent record not found. Please contact administration." }
  }

  return { valid: true, user, profile, parent }
}

/**
 * Validate admin dashboard access
 */
export async function validateDashboardAccess(): Promise<ValidationResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { valid: false, error: "Not authenticated" }
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    return { valid: false, error: "Profile not found" }
  }

  if (profile.status !== "ACTIVE" || !profile.isActive) {
    return { valid: false, error: "Account is not active" }
  }

  if (!profile.schoolId) {
    return { valid: false, error: "No school assigned. Please contact administration." }
  }

  const school = await prisma.school.findUnique({
    where: { id: profile.schoolId },
    select: { id: true, isActive: true },
  })

  if (!school || !school.isActive) {
    return { valid: false, error: "School is not active." }
  }

  return { valid: true, user, profile }
}
