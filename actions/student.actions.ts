"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

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

export async function createStudent(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
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

  try {
    const student = await prisma.student.create({
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
        admissionNo: admissionNo || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
      },
    })

    if (classId && academicSessionId) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          classId,
          sectionId: sectionId || null,
          academicSessionId,
          rollNumber: rollNumber || null,
        },
      })
    }

    revalidatePath("/dashboard/students")

    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Student",
      entityId: student.id,
      newValues: { firstName, lastName, admissionNo },
    })

    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to create student. Please try again.", success: false }
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

  // School isolation: verify student belongs to user's school
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

  // School isolation: verify student belongs to user's school
  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.student.delete({ where: { id: studentId } })
    revalidatePath("/dashboard/students")
  } catch (e) {
    // Silently fail — student may have dependent records
  }
}
