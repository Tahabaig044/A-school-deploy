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
  employeeCode: z.string().min(1, "Employee code is required").max(50),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED"]).optional(),
})

type ActionResult = {
  error?: string
  success?: boolean
  invitationLink?: string
}

/**
 * Complete Teacher Creation Workflow:
 * 1. Validate form
 * 2. Create Teacher record
 * 3. Create Supabase Auth User
 * 4. Create Profile (linked to auth user)
 * 5. Link Teacher to Profile
 * 6. Generate invitation token
 * 7. Send invitation
 * 8. Rollback if any step fails
 */
export async function createTeacher(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Teacher")
  const branchId = getBranchId(profile, formData, "Create Teacher")
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const qualification = formData.get("qualification") as string
  const specialization = formData.get("specialization") as string
  const joiningDate = formData.get("joiningDate") as string

  const parsed = teacherSchema.safeParse({
    firstName, lastName, employeeCode, phone, email, address,
    qualification, specialization, joiningDate,
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

  // Check employee code uniqueness within school
  const existingTeacher = await prisma.teacher.findUnique({
    where: { schoolId_employeeCode: { schoolId, employeeCode } },
    select: { id: true },
  })
  if (existingTeacher) {
    return { error: "A teacher with this employee code already exists in this school.", success: false }
  }

  // Generate invitation token
  const rawToken = generateToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)
  const teacherId = randomUUID()

  try {
    // Step 1: Create Teacher record
    await prisma.teacher.create({
      data: {
        id: teacherId,
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
        joiningDate: joiningDate ? new Date(joiningDate) : null,
      },
    })

    // Step 2: Create Supabase Auth User
    const serviceClient = await createServiceClient()
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: generateToken(), // Random unusable password - user will set via invitation
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: "TEACHER",
      },
    })

    if (authError || !authData?.user) {
      console.error("[createTeacher] Supabase auth error:", JSON.stringify(authError, null, 2))
      // Rollback teacher record
      await prisma.teacher.delete({ where: { id: teacherId } }).catch(() => {})
      const msg = authError?.message || authError?.code || "Unknown auth error"
      return { error: `Auth failed: ${msg}`, success: false }
    }

    const authUserId = authData.user.id

    // Step 3 & 4: Create Profile and link to Teacher (in transaction)
    await prisma.$transaction(async (tx) => {
      // Create profile with auth user ID
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

      // Link teacher to profile
      await tx.teacher.update({
        where: { id: teacherId },
        data: { profileId: authUserId },
      })
    })

    // Step 5: Audit log
    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Teacher",
      entityId: teacherId,
      newValues: { firstName, lastName, employeeCode, email, profileId: authUserId },
    })

    // Step 6: Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`

    revalidatePath("/dashboard/teachers")
    return { success: true, invitationLink }
  } catch (e: any) {
    console.error("[createTeacher] Exception:", e?.message || e)
    // Rollback: delete teacher record if it was created
    await prisma.teacher.delete({ where: { id: teacherId } }).catch(() => {})
    return { error: `Failed: ${e?.message || "Unknown error"}`, success: false }
  }
}

export async function updateTeacher(
  teacherId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
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
  const employeeCode = formData.get("employeeCode") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const qualification = formData.get("qualification") as string
  const specialization = formData.get("specialization") as string
  const joiningDate = formData.get("joiningDate") as string
  const status = formData.get("status") as string

  const parsed = teacherSchema.safeParse({
    firstName, lastName, employeeCode, phone, email, address,
    qualification, specialization, joiningDate, status,
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
        employeeCode,
        phone: phone || null,
        email: email || null,
        address: address || null,
        qualification: qualification || null,
        specialization: specialization || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status as any,
      },
    })

    // Sync profile if linked
    if (existing.profileId) {
      await prisma.profile.update({
        where: { id: existing.profileId },
        data: { firstName, lastName, phone: phone || null },
      }).catch(() => {})
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
      await prisma.profile.update({
        where: { id: existing.profileId },
        data: { status: "SUSPENDED", isActive: false },
      }).catch(() => {})
    }

    revalidatePath("/dashboard/teachers")
  } catch (e) {
    // Silently fail — teacher may have dependent records
  }
}
