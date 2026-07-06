"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function createSchool(
  _prevState: unknown,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN")

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const address = formData.get("address") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  await prisma.school.create({
    data: { name, code, address, phone, email },
  })

  revalidatePath("/dashboard/schools")
}

export async function updateSchool(schoolId: string, formData: FormData) {
  await requireRole("SUPER_ADMIN")

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const address = formData.get("address") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  await prisma.school.update({
    where: { id: schoolId },
    data: { name, code, address, phone, email },
  })

  revalidatePath("/dashboard/schools")
}

export async function deleteSchool(schoolId: string) {
  await requireRole("SUPER_ADMIN")

  await prisma.school.delete({ where: { id: schoolId } })

  revalidatePath("/dashboard/schools")
}
