"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"

export async function createBranch(
  _prevState: unknown,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Branch")

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const address = formData.get("address") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  await prisma.branch.create({
    data: { schoolId, name, code, address, phone, email },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    action: "CREATE",
    entityType: "Branch",
    newValues: { name, code },
  })

  revalidatePath("/dashboard/branches")
}

export async function updateBranch(branchId: string, formData: FormData) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const address = formData.get("address") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  await prisma.branch.update({
    where: { id: branchId },
    data: { name, code, address, phone, email },
  })

  revalidatePath("/dashboard/branches")
}

export async function deleteBranch(branchId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  await prisma.branch.delete({ where: { id: branchId } })

  await logAuditEvent({
    userId: profile.id,
    action: "DELETE",
    entityType: "Branch",
    entityId: branchId,
  })

  revalidatePath("/dashboard/branches")
}
