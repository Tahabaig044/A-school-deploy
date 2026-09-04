"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"

const ATTENDANCE_POLICY_KEY = "attendance_policy"

export async function getAttendancePolicy(schoolId: string): Promise<string> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId
  if (!effectiveSchoolId) return "first_period_teacher"

  const setting = await prisma.setting.findUnique({
    where: { schoolId_key: { schoolId: effectiveSchoolId, key: ATTENDANCE_POLICY_KEY } },
  })
  return setting?.value || "first_period_teacher"
}

export async function updateAttendancePolicy(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")
  const schoolId = getSchoolId(profile, formData, "Update Attendance Policy")
  const policy = formData.get("policy") as string

  const validPolicies = ["first_period_teacher", "class_teacher", "subject_teacher", "admin_only"]
  if (!validPolicies.includes(policy)) {
    return { error: "Invalid attendance policy.", success: false }
  }

  await prisma.setting.upsert({
    where: { schoolId_key: { schoolId, key: ATTENDANCE_POLICY_KEY } },
    update: { value: policy },
    create: { schoolId, key: ATTENDANCE_POLICY_KEY, value: policy },
  })

  revalidatePath("/dashboard/settings")
  return { success: true }
}
