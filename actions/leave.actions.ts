"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole, requireAuth } from "@/lib/auth"

export async function createLeaveRequest(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await requireAuth()

  const leaveType = formData.get("leaveType") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const reason = formData.get("reason") as string

  await prisma.leaveRequest.create({
    data: {
      profileId: user.id,
      leaveType: leaveType as any,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
  })

  revalidatePath("/dashboard/leaves")
  return { success: true, error: undefined }
}

export async function approveLeave(leaveId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  // School isolation: verify leave request belongs to user's school
  const existing = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: { profileId: true },
  })
  if (!existing) return
  const leaveProfile = await prisma.profile.findUnique({
    where: { id: existing.profileId },
    select: { schoolId: true },
  })
  if (!leaveProfile) return
  if (profile.role !== "SUPER_ADMIN" && leaveProfile.schoolId !== profile.schoolId) return

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "APPROVED", approvedBy: profile.id },
  })

  revalidatePath("/dashboard/leaves")
}

export async function rejectLeave(leaveId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  // School isolation: verify leave request belongs to user's school
  const existing = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: { profileId: true },
  })
  if (!existing) return
  const leaveProfile = await prisma.profile.findUnique({
    where: { id: existing.profileId },
    select: { schoolId: true },
  })
  if (!leaveProfile) return
  if (profile.role !== "SUPER_ADMIN" && leaveProfile.schoolId !== profile.schoolId) return

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "REJECTED", approvedBy: profile.id },
  })

  revalidatePath("/dashboard/leaves")
}
