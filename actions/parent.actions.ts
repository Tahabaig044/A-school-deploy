"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { generateToken, hashToken } from "@/lib/token"
import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const INVITATION_EXPIRY_HOURS = 24

const parentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
})

type ActionResult = {
  error?: string
  success?: boolean
  invitationLink?: string
}

/**
 * Complete Parent Creation Workflow:
 * 1. Validate form
 * 2. Create Parent record
 * 3. Link to Student(s)
 * 4. Create Supabase Auth User
 * 5. Create Profile
 * 6. Assign Parent Role
 * 7. Generate Invitation
 */
export async function addParent(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER"
  )

  const schoolId = getSchoolId(profile, formData, "Add Parent")
  const studentId = formData.get("studentId") as string
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const relationship = formData.get("relationship") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const occupation = formData.get("occupation") as string
  const address = formData.get("address") as string
  const isPrimary = formData.get("isPrimary") === "on"

  const parsed = parentSchema.safeParse({
    firstName, lastName, relationship, phone, email, occupation, address, isPrimary,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  // Generate invitation token if email provided
  let rawToken: string | null = null
  let hashedToken: string | null = null
  let expiresAt: Date | null = null

  if (email) {
    // Check email uniqueness
    const existingProfile = await prisma.profile.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingProfile) {
      return { error: "A user with this email already exists.", success: false }
    }

    rawToken = generateToken()
    hashedToken = hashToken(rawToken)
    expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)
  }

  try {
    // Create parent record
    const parent = await prisma.parent.create({
      data: {
        schoolId,
        firstName,
        lastName,
        relationship: relationship as any,
        phone: phone || null,
        email: email || null,
        occupation: occupation || null,
        address: address || null,
        isPrimary,
      },
    })

    // Link to student
    if (studentId) {
      await prisma.studentParent.create({
        data: { studentId, parentId: parent.id },
      })
    }

    // Create auth user and profile for portal (if email provided)
    if (email && rawToken && hashedToken && expiresAt) {
      const serviceClient = await createServiceClient()
      const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
        email,
        password: generateToken(), // Random unusable password
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "PARENT",
        },
      })

      if (!authError && authData?.user) {
        await prisma.profile.create({
          data: {
            id: authData.user.id,
            email,
            firstName,
            lastName,
            role: "PARENT",
            phone: phone || null,
            schoolId,
            branchId: profile.branchId,
            status: "INVITED",
            invitationToken: hashedToken,
            invitationExpiresAt: expiresAt,
            invitedById: profile.id,
          },
        })
      }
    }

    // Audit log
    await logAuditEvent({
      userId: profile.id,
      schoolId,
      action: "CREATE",
      entityType: "Parent",
      entityId: parent.id,
      newValues: { firstName, lastName, relationship, studentId },
    })

    if (studentId) revalidatePath(`/dashboard/students/${studentId}`)
    revalidatePath("/dashboard/students")

    const invitationLink = rawToken
      ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`
      : undefined

    return { success: true, invitationLink }
  } catch (e) {
    return { error: "Failed to add parent. Please try again.", success: false }
  }
}

export async function removeParent(studentId: string, parentId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  await prisma.studentParent.delete({
    where: { studentId_parentId: { studentId, parentId } },
  })

  revalidatePath(`/dashboard/students/${studentId}`)
}

export async function enrollStudent(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ADMISSION_OFFICER")

  const studentId = formData.get("studentId") as string
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const rollNumber = formData.get("rollNumber") as string

  await prisma.studentEnrollment.create({
    data: {
      studentId,
      classId,
      sectionId: sectionId || null,
      academicSessionId,
      rollNumber: rollNumber || null,
    },
  })

  revalidatePath(`/dashboard/students/${studentId}`)
  return { success: true, error: undefined }
}
