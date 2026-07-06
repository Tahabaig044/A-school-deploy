"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"

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
}

export async function updateStudent(
  studentId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER"
  )

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
}

export async function deleteStudent(studentId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  await prisma.student.delete({ where: { id: studentId } })

  revalidatePath("/dashboard/students")
}
