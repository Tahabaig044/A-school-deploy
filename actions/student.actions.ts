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

const studentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  admissionNo: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "TRANSFERRED", "WITHDRAWN", "GRADUATED"]).optional(),
})

const enrollmentSchema = z.object({
  classId: z.string().uuid("Invalid class"),
  sectionId: z.string().uuid("Invalid section").optional().nullable(),
  academicSessionId: z.string().uuid("Invalid academic session"),
  rollNumber: z.string().optional().nullable(),
})

type ActionResult = {
  error?: string
  success?: boolean
  admissionId?: string
  invitationLink?: string
}

/**
 * Generate unique admission number: ADM-YYYY-NNNNN
 */
async function generateAdmissionNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ADM-${year}-`

  const lastAdmission = await prisma.admission.findFirst({
    where: {
      schoolId,
      admissionNo: { startsWith: prefix },
    },
    orderBy: { admissionNo: "desc" },
    select: { admissionNo: true },
  })

  if (lastAdmission?.admissionNo) {
    const lastNum = parseInt(lastAdmission.admissionNo.split("-")[2] || "0", 10)
    return `${prefix}${String(lastNum + 1).padStart(5, "0")}`
  }

  return `${prefix}00001`
}

/**
 * Generate roll number for enrollment
 */
async function generateRollNumber(classId: string, academicSessionId: string): Promise<string> {
  const count = await prisma.studentEnrollment.count({
    where: { classId, academicSessionId },
  })
  return String(count + 1).padStart(3, "0")
}

/**
 * Complete Student Admission Workflow:
 * 1. Validate form
 * 2. Generate admission number
 * 3. Create Admission record
 * 4. Create Guardian records
 * 5. Optionally create auth user + profile for portal
 */
export async function createStudent(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER"
  )

  const schoolId = getSchoolId(profile, formData, "Create Student")
  const branchId = getBranchId(profile, formData, "Create Student")
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const dateOfBirth = formData.get("dateOfBirth") as string
  const gender = formData.get("gender") as string
  const bloodGroup = formData.get("bloodGroup") as string
  const religion = formData.get("religion") as string
  const nationality = formData.get("nationality") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const postalCode = formData.get("postalCode") as string
  const admissionNo = formData.get("admissionNo") as string
  const admissionDate = formData.get("admissionDate") as string
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const rollNumber = formData.get("rollNumber") as string

  const parsed = studentSchema.safeParse({
    firstName, lastName, dateOfBirth, gender, bloodGroup, religion,
    nationality, phone, email, address, city, state, postalCode,
    admissionNo, admissionDate,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  // Normalize empty strings to null for optional fields
  const cleanSectionId = sectionId?.trim() || null
  const cleanClassId = classId?.trim() || null
  const cleanAcademicSessionId = academicSessionId?.trim() || null

  // Validate enrollment data if provided
  if (cleanClassId && cleanAcademicSessionId) {
    const enrollmentParsed = enrollmentSchema.safeParse({
      classId: cleanClassId,
      sectionId: cleanSectionId,
      academicSessionId: cleanAcademicSessionId,
      rollNumber,
    })
    if (!enrollmentParsed.success) {
      return { error: enrollmentParsed.error.issues[0].message, success: false }
    }
  }

  // Generate admission number
  const generatedAdmissionNo = admissionNo || await generateAdmissionNumber(schoolId)

  // Generate roll number if not provided
  const generatedRollNumber = rollNumber || (cleanClassId && cleanAcademicSessionId
    ? await generateRollNumber(cleanClassId, cleanAcademicSessionId)
    : null)

  // Generate invitation token if email provided
  let rawToken: string | null = null
  let hashedToken: string | null = null
  let expiresAt: Date | null = null

  if (email) {
    rawToken = generateToken()
    hashedToken = hashToken(rawToken)
    expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)
  }

  try {
    // Create student and enrollment in transaction
    const student = await prisma.$transaction(async (tx) => {
      // Create student record
      const newStudent = await tx.student.create({
        data: {
          schoolId,
          branchId,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender as any,
          bloodGroup: bloodGroup || null,
          religion: religion || null,
          nationality: nationality || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          admissionNo: generatedAdmissionNo,
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          status: "ACTIVE",
        },
      })

      // Create enrollment if class and session provided
      if (cleanClassId && cleanAcademicSessionId) {
        await tx.studentEnrollment.create({
          data: {
            studentId: newStudent.id,
            classId: cleanClassId,
            sectionId: cleanSectionId,
            academicSessionId: cleanAcademicSessionId,
            rollNumber: generatedRollNumber,
          },
        })
      }

      return newStudent
    })

    // Create auth user and profile for portal access (if email provided)
    if (email && rawToken && hashedToken && expiresAt) {
      const serviceClient = await createServiceClient()
      const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
        email,
        password: generateToken(), // Random unusable password
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "STUDENT",
        },
      })

      if (!authError && authData?.user) {
        await prisma.profile.create({
          data: {
            id: authData.user.id,
            email,
            firstName,
            lastName,
            role: "STUDENT",
            phone: phone || null,
            schoolId,
            branchId,
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
      branchId,
      action: "CREATE",
      entityType: "Student",
      entityId: student.id,
      newValues: { firstName, lastName, admissionNo: generatedAdmissionNo },
    })

    revalidatePath("/dashboard/students")
    revalidatePath("/dashboard/admissions")

    const invitationLink = rawToken
      ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`
      : undefined

    return { success: true, invitationLink }
  } catch (e) {
    return { error: "Failed to create student. Please try again.", success: false }
  }
}

/**
 * Approve Admission and Enroll Student:
 * 1. Validate admission status
 * 2. Create Student record from admission data
 * 3. Create Enrollment
 * 4. Convert guardians to parents
 * 5. Create parent-student relationships
 * 6. Create auth user + profile for portal
 */
export async function approveAndEnrollStudent(admissionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true, branchId: true, status: true },
  })
  if (!admission) return { error: "Admission not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && admission.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }
  if (admission.status !== "APPROVED") {
    return { error: "Only approved admissions can be enrolled.", success: false }
  }

  try {
    const fullAdmission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { guardians: true },
    })
    if (!fullAdmission) return { error: "Admission not found.", success: false }

    // Generate roll number
    const rollNumber = await generateRollNumber(
      fullAdmission.appliedClassId,
      fullAdmission.academicSessionId
    )

    // Generate invitation token
    const rawToken = generateToken()
    const hashedToken = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

    const result = await prisma.$transaction(async (tx) => {
      // Create student record
      const student = await tx.student.create({
        data: {
          schoolId: fullAdmission.schoolId!,
          branchId: fullAdmission.branchId!,
          firstName: fullAdmission.firstName,
          lastName: fullAdmission.lastName,
          dateOfBirth: fullAdmission.dateOfBirth,
          gender: fullAdmission.gender,
          bloodGroup: fullAdmission.bloodGroup,
          religion: fullAdmission.religion,
          nationality: fullAdmission.nationality,
          phone: fullAdmission.phone,
          email: fullAdmission.email,
          address: fullAdmission.address,
          city: fullAdmission.city,
          state: fullAdmission.state,
          postalCode: fullAdmission.postalCode,
          photoUrl: fullAdmission.photoUrl,
          admissionNo: fullAdmission.admissionNo,
          admissionDate: new Date(),
          status: "ACTIVE",
        },
      })

      // Create enrollment
      await tx.studentEnrollment.create({
        data: {
          studentId: student.id,
          classId: fullAdmission.appliedClassId,
          sectionId: null,
          academicSessionId: fullAdmission.academicSessionId,
          rollNumber,
          enrollmentDate: new Date(),
          status: "ACTIVE",
        },
      })

      // Convert guardians to parents
      if (fullAdmission.guardians && fullAdmission.guardians.length > 0) {
        const parentData = fullAdmission.guardians.map((guardian) => ({
          schoolId: fullAdmission.schoolId!,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          relationship: guardian.relationship,
          phone: guardian.phone,
          email: guardian.email,
          occupation: guardian.occupation,
          address: guardian.address,
          isPrimary: guardian.isPrimary,
        }))

        await tx.parent.createMany({ data: parentData })

        const parentRecords = await tx.parent.findMany({
          where: {
            schoolId: fullAdmission.schoolId!,
            firstName: { in: fullAdmission.guardians.map((g) => g.firstName) },
            lastName: { in: fullAdmission.guardians.map((g) => g.lastName) },
          },
          select: { id: true },
        })

        const studentParentData = parentRecords.map((p) => ({
          studentId: student.id,
          parentId: p.id,
        }))

        if (studentParentData.length > 0) {
          await tx.studentParent.createMany({ data: studentParentData })
        }
      }

      // Update admission
      await tx.admission.update({
        where: { id: admissionId },
        data: {
          studentId: student.id,
          reviewedById: profile.id,
          reviewedAt: new Date(),
          approvedAt: new Date(),
        },
      })

      return student
    })

    // Create auth user for portal (outside transaction)
    if (fullAdmission.email) {
      const serviceClient = await createServiceClient()
      const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
        email: fullAdmission.email,
        password: generateToken(),
        email_confirm: true,
        user_metadata: {
          first_name: fullAdmission.firstName,
          last_name: fullAdmission.lastName,
          role: "STUDENT",
        },
      })

      if (!authError && authData?.user) {
        await prisma.profile.create({
          data: {
            id: authData.user.id,
            email: fullAdmission.email,
            firstName: fullAdmission.firstName,
            lastName: fullAdmission.lastName,
            role: "STUDENT",
            phone: fullAdmission.phone || null,
            schoolId: fullAdmission.schoolId!,
            branchId: fullAdmission.branchId!,
            status: "INVITED",
            invitationToken: hashedToken,
            invitationExpiresAt: expiresAt,
            invitedById: profile.id,
          },
        })
      }
    }

    await logAuditEvent({
      userId: profile.id,
      action: "UPDATE",
      entityType: "Admission",
      entityId: admissionId,
      newValues: { status: "ENROLLED", studentId: result.id },
    })

    revalidatePath("/dashboard/admissions")
    revalidatePath(`/dashboard/admissions/${admissionId}`)
    revalidatePath("/dashboard/students")

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`

    return { success: true, invitationLink }
  } catch (e) {
    return { error: "Failed to enroll student. Please try again.", success: false }
  }
}

export async function updateStudent(
  studentId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER"
  )

  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Student not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const dateOfBirth = formData.get("dateOfBirth") as string
  const gender = formData.get("gender") as string
  const bloodGroup = formData.get("bloodGroup") as string
  const religion = formData.get("religion") as string
  const nationality = formData.get("nationality") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const postalCode = formData.get("postalCode") as string
  const admissionNo = formData.get("admissionNo") as string
  const admissionDate = formData.get("admissionDate") as string
  const status = formData.get("status") as string

  const parsed = studentSchema.safeParse({
    firstName, lastName, dateOfBirth, gender, bloodGroup, religion,
    nationality, phone, email, address, city, state, postalCode,
    admissionNo, admissionDate, status,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender as any,
        bloodGroup: bloodGroup || null,
        religion: religion || null,
        nationality: nationality || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        admissionNo: admissionNo || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
        status: status as any,
      },
    })

    revalidatePath("/dashboard/students")
    revalidatePath(`/dashboard/students/${studentId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update student. Please try again.", success: false }
  }
}

export async function deleteStudent(studentId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { status: "WITHDRAWN" },
    })
    revalidatePath("/dashboard/students")
  } catch (e) {
    // Silently fail — student may have dependent records
  }
}
