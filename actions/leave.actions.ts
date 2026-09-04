"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole, requireAuth } from "@/lib/auth"

export async function createLeaveRequest(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
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

export async function approveLeave(leaveId: string, substituteTeacherId?: string | null) {
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

  // If substitute teacher provided, validate they exist and belong to same school
  if (substituteTeacherId) {
    const substitute = await prisma.teacher.findUnique({
      where: { id: substituteTeacherId },
      select: { schoolId: true, status: true },
    })
    if (!substitute || substitute.status !== "ACTIVE") {
      return
    }
    if (profile.role !== "SUPER_ADMIN" && substitute.schoolId !== profile.schoolId) {
      return
    }
  }

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: "APPROVED",
      approvedBy: profile.id,
      substituteTeacherId: substituteTeacherId || null,
    },
  })

  revalidatePath("/dashboard/leaves")
}

export async function approveLeaveWithSubstitute(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const leaveId = formData.get("leaveId") as string
  const substituteTeacherId = formData.get("substituteTeacherId") as string

  if (!leaveId) return { error: "Leave ID is required.", success: false }

  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: { profileId: true },
  })
  if (!existing) return { error: "Leave request not found.", success: false }

  const leaveProfile = await prisma.profile.findUnique({
    where: { id: existing.profileId },
    select: { schoolId: true },
  })
  if (!leaveProfile) return { error: "Profile not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && leaveProfile.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  if (substituteTeacherId) {
    const substitute = await prisma.teacher.findUnique({
      where: { id: substituteTeacherId },
      select: { schoolId: true, status: true },
    })
    if (!substitute) return { error: "Substitute teacher not found.", success: false }
    if (substitute.status !== "ACTIVE")
      return { error: "Substitute teacher is not active.", success: false }
  }

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: "APPROVED",
      approvedBy: profile.id,
      substituteTeacherId: substituteTeacherId || null,
    },
  })

  revalidatePath("/dashboard/leaves")
  return { success: true }
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
