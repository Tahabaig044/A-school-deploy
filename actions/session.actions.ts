"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getOptionalBranchId } from "@/lib/school-context"

export async function createSession(
  _prevState: unknown,
  formData: FormData
) {
  const { profile: sessionProfile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN"
  )

  const schoolId = getSchoolId(sessionProfile, formData, "Create Academic Session")

  const name = formData.get("name") as string
  const branchId = getOptionalBranchId(sessionProfile, formData)
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const isCurrent = formData.get("isCurrent") === "on"

  await prisma.academicSession.create({ 
    data: {
      school: { connect: { id: schoolId } },
      branch: branchId ? { connect: { id: branchId } } : undefined,
      name, startDate, endDate, isCurrent,
    },
  })

  revalidatePath("/dashboard/sessions")
}

export async function setCurrentSession(sessionId: string) {
  await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN"
  )

  const session = await prisma.academicSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) return

  await prisma.academicSession.updateMany({
    where: { schoolId: session.schoolId },
    data: { isCurrent: false },
  })

  await prisma.academicSession.update({
    where: { id: sessionId },
    data: { isCurrent: true },
  })

  revalidatePath("/dashboard/sessions")
}

export async function deleteSession(sessionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  await prisma.academicSession.delete({ where: { id: sessionId } })

  revalidatePath("/dashboard/sessions")
}
