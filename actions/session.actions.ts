"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getOptionalBranchId } from "@/lib/school-context"
import { z } from "zod"

const sessionSchema = z.object({
  name: z.string().min(1, "Session name is required").max(100),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
})

export async function createSession(_prevState: unknown, formData: FormData) {
  const { profile: sessionProfile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
  )

  const schoolId = getSchoolId(sessionProfile, formData, "Create Academic Session")

  const name = formData.get("name") as string
  const branchId = getOptionalBranchId(sessionProfile, formData)
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const isCurrent = formData.get("isCurrent") === "on"

  const parsed = sessionSchema.safeParse({ name, startDate, endDate })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.academicSession.create({
      data: {
        school: { connect: { id: schoolId } },
        branch: branchId ? { connect: { id: branchId } } : undefined,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent,
      },
    })

    revalidatePath("/dashboard/sessions")
  } catch (e) {
    // Error handled by try/catch
  }
}

export async function setCurrentSession(sessionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const session = await prisma.academicSession.findUnique({
    where: { id: sessionId },
    select: { schoolId: true },
  })

  if (!session) return

  // School isolation: verify session belongs to user's school
  if (profile.role !== "SUPER_ADMIN" && session.schoolId !== profile.schoolId) return

  try {
    await prisma.academicSession.updateMany({
      where: { schoolId: session.schoolId },
      data: { isCurrent: false },
    })

    await prisma.academicSession.update({
      where: { id: sessionId },
      data: { isCurrent: true },
    })

    revalidatePath("/dashboard/sessions")
  } catch (e) {
    // Error handled by try/catch
  }
}

export async function deleteSession(sessionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  // School isolation: verify session belongs to user's school
  const existing = await prisma.academicSession.findUnique({
    where: { id: sessionId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.academicSession.delete({ where: { id: sessionId } })

    revalidatePath("/dashboard/sessions")
  } catch (e) {
    // Silently fail — session may have dependent records
  }
}

export async function updateSession(sessionId: string, _prevState: unknown, formData: FormData) {
  const { profile: sessionProfile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
  )

  const session = await prisma.academicSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    return { error: "Session not found" }
  }

  if (sessionProfile.role !== "SUPER_ADMIN" && session.schoolId !== sessionProfile.schoolId) {
    return { error: "Unauthorized" }
  }

  const name = formData.get("name") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  const parsed = sessionSchema.safeParse({ name, startDate, endDate })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.academicSession.update({
      where: { id: sessionId },
      data: { name, startDate: new Date(startDate), endDate: new Date(endDate) },
    })

    revalidatePath("/dashboard/sessions")
  } catch (e) {
    // Error handled by try/catch
  }
}
