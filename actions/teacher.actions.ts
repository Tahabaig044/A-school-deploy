"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { generateToken, hashToken } from "@/lib/token"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const INVITATION_EXPIRY_HOURS = 24

const teacherSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  experience: z.coerce.number().int().min(0).optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED"]).optional(),
})

const DEFAULT_MAX_PERIODS_PER_DAY = 8
const DEFAULT_MAX_PERIODS_PER_WEEK = 40

/**
 * Auto-generate employee code: EMP-YYYY-NNNNN
 */
async function generateEmployeeCode(schoolId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `EMP-${year}-`

  const lastTeacher = await prisma.teacher.findFirst({
    where: {
      schoolId,
      employeeCode: { startsWith: prefix },
    },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  })

  if (lastTeacher?.employeeCode) {
    const lastNum = parseInt(lastTeacher.employeeCode.split("-")[2] || "0", 10)
    return `${prefix}${String(lastNum + 1).padStart(5, "0")}`
  }

  return `${prefix}00001`
}

type ActionResult = {
  error?: string
  success?: boolean
  invitationLink?: string
}

/**
 * Complete Teacher Creation Workflow (Atomic):
 * 1. Validate form
 * 2. Auto-generate employee code
 * 3. Check email uniqueness
 * 4. Create Supabase Auth User (external — done first, outside transaction)
 * 5. In Prisma $transaction:
 *    a. Create Teacher record
 *    b. Create Profile (linked to auth user)
 *    c. Link Teacher ↔ Profile
 *    d. Set default workload preferences
 * 6. Log audit event
 * 7. Generate invitation link
 * 8. If step 4 fails → nothing in DB, safe to return
 * 9. If step 5 fails → rollback DB + cleanup auth user
 */
export async function createTeacher(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Teacher")
  const branchId = getBranchId(profile, formData, "Create Teacher")
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const qualification = formData.get("qualification") as string
  const specialization = formData.get("specialization") as string
  const designation = formData.get("designation") as string
  const department = formData.get("department") as string
  const experience = formData.get("experience") as string
  const joiningDate = formData.get("joiningDate") as string

  const parsed = teacherSchema.safeParse({
    firstName,
    lastName,
    phone,
    email,
    address,
    qualification,
    specialization,
    designation,
    department,
    experience: experience || null,
    joiningDate,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  if (!email) {
    return { error: "Email is required for teacher portal access.", success: false }
  }

  // Check email uniqueness
  const existingProfile = await prisma.profile.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existingProfile) {
    return { error: "A user with this email already exists.", success: false }
  }

  // Step 2: Auto-generate employee code
  const employeeCode = await generateEmployeeCode(schoolId)

  // Generate invitation token
  const rawToken = generateToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

  // Step 4: Create Supabase Auth User FIRST (outside transaction)
  const serviceClient = await createServiceClient()
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: generateToken(), // Random unusable password — user sets via invitation
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: "TEACHER",
    },
  })

  if (authError || !authData?.user) {
    console.error("[createTeacher] Supabase auth error:", JSON.stringify(authError, null, 2))
    const msg = authError?.message || authError?.code || "Unknown auth error"
    return { error: `Auth failed: ${msg}`, success: false }
  }

  const authUserId = authData.user.id
  let teacherId = ""

  try {
    // Step 5: All DB writes in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      // 5a. Create Teacher record
      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          branchId,
          firstName,
          lastName,
          employeeCode,
          phone: phone || null,
          email,
          address: address || null,
          qualification: qualification || null,
          specialization: specialization || null,
          designation: designation || null,
          department: department || null,
          experience: experience ? parseInt(experience) : null,
          joiningDate: joiningDate ? new Date(joiningDate) : null,
          maxPeriodsPerDay: DEFAULT_MAX_PERIODS_PER_DAY,
          maxPeriodsPerWeek: DEFAULT_MAX_PERIODS_PER_WEEK,
          status: "ACTIVE",
        },
      })
      teacherId = teacher.id

      // 5b. Create Profile
      await tx.profile.create({
        data: {
          id: authUserId,
          email,
          firstName,
          lastName,
          role: "TEACHER",
          phone: phone || null,
          schoolId,
          branchId,
          status: "INVITED",
          invitationToken: hashedToken,
          invitationExpiresAt: expiresAt,
          invitedById: profile.id,
        },
      })

      // 5c. Link Teacher ↔ Profile
      await tx.teacher.update({
        where: { id: teacherId },
        data: { profileId: authUserId },
      })
    })

    // Step 6: Audit log
    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Teacher",
      entityId: teacherId,
      newValues: { firstName, lastName, employeeCode, email, profileId: authUserId },
    })

    // Step 7: Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`

    revalidatePath("/dashboard/teachers")
    return { success: true, invitationLink }
  } catch (e: any) {
    console.error("[createTeacher] Transaction failed, cleaning up auth user:", e?.message || e)
    // Cleanup: delete Supabase auth user (transaction already rolled back)
    await serviceClient.auth.admin.deleteUser(authUserId).catch((cleanupErr) => {
      console.error("[createTeacher] Failed to cleanup auth user:", cleanupErr)
    })
    return { error: `Failed: ${e?.message || "Unknown error"}`, success: false }
  }
}

export async function updateTeacher(
  teacherId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true, profileId: true },
  })
  if (!existing) return { error: "Teacher not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const qualification = formData.get("qualification") as string
  const specialization = formData.get("specialization") as string
  const designation = formData.get("designation") as string
  const department = formData.get("department") as string
  const experience = formData.get("experience") as string
  const joiningDate = formData.get("joiningDate") as string
  const status = formData.get("status") as string

  const parsed = teacherSchema.safeParse({
    firstName,
    lastName,
    phone,
    email,
    address,
    qualification,
    specialization,
    designation,
    department,
    experience: experience || null,
    joiningDate,
    status,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        firstName,
        lastName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        qualification: qualification || null,
        specialization: specialization || null,
        designation: designation || null,
        department: department || null,
        experience: experience ? parseInt(experience) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status as any,
      },
    })

    // Sync profile if linked
    if (existing.profileId) {
      await prisma.profile
        .update({
          where: { id: existing.profileId },
          data: { firstName, lastName, phone: phone || null },
        })
        .catch(() => {})
    }

    revalidatePath("/dashboard/teachers")
    revalidatePath(`/dashboard/teachers/${teacherId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update teacher. Please try again.", success: false }
  }
}

export async function deleteTeacher(teacherId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true, profileId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    // Soft-delete: mark as inactive instead of hard delete
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { status: "RESIGNED" },
    })

    // Deactivate linked profile
    if (existing.profileId) {
      await prisma.profile
        .update({
          where: { id: existing.profileId },
          data: { status: "SUSPENDED", isActive: false },
        })
        .catch(() => {})
    }

    revalidatePath("/dashboard/teachers")
  } catch (e) {
    // Silently fail — teacher may have dependent records
  }
}

export async function suspendTeacher(teacherId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true, profileId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { status: "INACTIVE" },
  })

  if (existing.profileId) {
    await prisma.profile
      .update({
        where: { id: existing.profileId },
        data: { isActive: false, status: "SUSPENDED" },
      })
      .catch(() => {})
  }

  revalidatePath("/dashboard/teachers")
}

export async function activateTeacher(teacherId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true, profileId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { status: "ACTIVE" },
  })

  if (existing.profileId) {
    await prisma.profile
      .update({
        where: { id: existing.profileId },
        data: { isActive: true, status: "ACTIVE" },
      })
      .catch(() => {})
  }

  revalidatePath("/dashboard/teachers")
}
