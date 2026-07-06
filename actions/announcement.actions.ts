"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const announcementSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  audience: z.enum(["ALL", "TEACHERS", "STUDENTS", "PARENTS", "SPECIFIC_CLASS"]),
  classId: z.string().uuid().optional(),
  isPublished: z.boolean().default(true),
})

export async function createAnnouncement(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const schoolId = getSchoolId(profile, formData, "Create Announcement")
  const branchId = getBranchId(profile, formData, "Create Announcement")
  const authorId = formData.get("authorId") as string || profile.id
  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const audience = formData.get("audience") as string
  const classId = formData.get("classId") as string || undefined
  const isPublished = formData.get("isPublished") !== "false"

  const parsed = announcementSchema.safeParse({
    schoolId, branchId, authorId, title, content, audience, classId, isPublished,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.announcement.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      author: { connect: { id: authorId } },
      title, content, audience, classId,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "Announcement",
    newValues: { title, audience, isPublished },
  })

  revalidatePath("/dashboard/announcements")
  return { success: true, error: undefined }
}

export async function updateAnnouncement(
  announcementId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const audience = formData.get("audience") as string
  const classId = formData.get("classId") as string || undefined
  const isPublished = formData.get("isPublished") !== "false"

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      title, content, audience, classId, isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  })

  revalidatePath("/dashboard/announcements")
  return { success: true, error: undefined }
}

export async function deleteAnnouncement(announcementId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  await prisma.announcement.delete({ where: { id: announcementId } })
  revalidatePath("/dashboard/announcements")
  return { success: true }
}

export async function getAnnouncements(
  schoolId: string,
  branchId: string,
  filters?: { audience?: string; authorId?: string }
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT", "PARENT")

  return prisma.announcement.findMany({
    where: {
      schoolId, branchId,
      isPublished: true,
      ...(filters?.audience && { audience: filters.audience }),
      ...(filters?.authorId && { authorId: filters.authorId }),
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAnnouncementById(announcementId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT", "PARENT")

  return prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })
}
