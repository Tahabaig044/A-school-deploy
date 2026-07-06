"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"

export async function addParent(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
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

  if (studentId) {
    await prisma.studentParent.create({
      data: { studentId, parentId: parent.id },
    })
  }

  if (studentId) revalidatePath(`/dashboard/students/${studentId}`)
  revalidatePath("/dashboard/students")
  return { success: true, error: undefined }
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
