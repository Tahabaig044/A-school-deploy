"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { generateToken, hashToken } from "@/lib/token"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const INVITATION_EXPIRY_HOURS = 24

const staffSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  employeeCode: z.string().min(1, "Employee code is required").max(50),
  department: z.string().min(1, "Department is required").max(100),
  designation: z.string().min(1, "Designation is required").max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED"]).optional(),
})

type ActionResult = {
  error?: string
  success?: boolean
  invitationLink?: string
}

/**
 * Complete Staff Creation Workflow:
 * 1. Validate form
 * 2. Create Staff record
 * 3. Create Supabase Auth User
 * 4. Create Profile
 * 5. Assign Staff Role
 * 6. Generate Invitation
 */
export async function createStaff(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Staff")
  const branchId = getBranchId(profile, formData, "Create Staff")
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const department = formData.get("department") as string
  const designation = formData.get("designation") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const joiningDate = formData.get("joiningDate") as string

  const parsed = staffSchema.safeParse({
    firstName,
    lastName,
    employeeCode,
    department,
    designation,
    phone,
    email,
    joiningDate,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  if (!email) {
    return { error: "Email is required for staff portal access.", success: false }
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
  const existingStaff = await prisma.staff.findUnique({
    where: { schoolId_employeeCode: { schoolId, employeeCode } },
    select: { id: true },
  })
  if (existingStaff) {
    return {
      error: "A staff member with this employee code already exists in this school.",
      success: false,
    }
  }

  // Generate invitation token
  const rawToken = generateToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

  try {
    // Step 1: Create Staff record
    const staff = await prisma.staff.create({
      data: {
        schoolId,
        branchId,
        firstName,
        lastName,
        employeeCode,
        department,
        designation,
        phone: phone || null,
        email,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
      },
    })

    // Step 2: Create Supabase Auth User
    const serviceClient = await createServiceClient()
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: generateToken(), // Random unusable password
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: "ACCOUNTANT", // Default staff role
      },
    })

    if (authError || !authData?.user) {
      console.error("[createStaff] Supabase auth error:", JSON.stringify(authError, null, 2))
      // Rollback staff record
      await prisma.staff.delete({ where: { id: staff.id } }).catch(() => {})
      const msg = authError?.message || authError?.code || "Unknown auth error"
      return { error: `Auth failed: ${msg}`, success: false }
    }

    const authUserId = authData.user.id

    // Step 3 & 4: Create Profile and link to Staff (in transaction)
    await prisma.$transaction(async (tx) => {
      // Create profile with auth user ID
      await tx.profile.create({
        data: {
          id: authUserId,
          email,
          firstName,
          lastName,
          role: "ACCOUNTANT", // Default staff role
          phone: phone || null,
          schoolId,
          branchId,
          status: "INVITED",
          invitationToken: hashedToken,
          invitationExpiresAt: expiresAt,
          invitedById: profile.id,
        },
      })

      // Link staff to profile
      await tx.staff.update({
        where: { id: staff.id },
        data: { profileId: authUserId },
      })
    })

    // Step 5: Audit log
    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Staff",
      entityId: staff.id,
      newValues: {
        firstName,
        lastName,
        employeeCode,
        department,
        designation,
        email,
        profileId: authUserId,
      },
    })

    // Step 6: Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`

    revalidatePath("/dashboard/staff")
    return { success: true, invitationLink }
  } catch (e: any) {
    console.error("[createStaff] Exception:", e?.message || e)
    return { error: `Failed: ${e?.message || "Unknown error"}`, success: false }
  }
}

export async function updateStaff(
  staffId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const existing = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { schoolId: true, profileId: true },
  })
  if (!existing) return { error: "Staff not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const department = formData.get("department") as string
  const designation = formData.get("designation") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const joiningDate = formData.get("joiningDate") as string
  const status = formData.get("status") as string

  const parsed = staffSchema.safeParse({
    firstName,
    lastName,
    employeeCode,
    department,
    designation,
    phone,
    email,
    joiningDate,
    status,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        firstName,
        lastName,
        employeeCode,
        department,
        designation,
        phone: phone || null,
        email: email || null,
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

    revalidatePath("/dashboard/staff")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update staff. Please try again.", success: false }
  }
}

export async function deleteStaff(staffId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const existing = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { schoolId: true, profileId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    // Soft-delete: mark as inactive
    await prisma.staff.update({
      where: { id: staffId },
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

    revalidatePath("/dashboard/staff")
  } catch (e) {
    // Silently fail — staff may have dependent records
  }
}
