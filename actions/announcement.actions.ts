"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole, requireAuth } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const announcementSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  audience: z.enum([
    "ALL",
    "SCHOOL",
    "BRANCH",
    "CLASS",
    "SECTION",
    "TEACHERS",
    "STUDENTS",
    "PARENTS",
  ]),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  isPublished: z.boolean().default(true),
  scheduledAt: z.string().optional(),
})

export async function createAnnouncement(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const schoolId = getSchoolId(profile, formData, "Create Announcement")
  const branchId = getBranchId(profile, formData, "Create Announcement")
  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const audience = formData.get("audience") as string
  const classId = (formData.get("classId") as string) || undefined
  const sectionId = (formData.get("sectionId") as string) || undefined
  const isPublished = formData.get("isPublished") !== "false"
  const scheduledAt = (formData.get("scheduledAt") as string) || undefined

  const parsed = announcementSchema.safeParse({
    schoolId,
    branchId,
    title,
    content,
    audience,
    classId,
    sectionId,
    isPublished,
    scheduledAt,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const hasScheduledPublish = scheduledAt && new Date(scheduledAt) > new Date()

  const createData: any = {
    school: { connect: { id: schoolId } },
    branch: { connect: { id: branchId } },
    author: { connect: { id: profile.id } },
    title,
    content,
    audience,
    isPublished: hasScheduledPublish ? false : isPublished,
  }
  if (classId) createData.class = { connect: { id: classId } }
  if (sectionId) createData.section = { connect: { id: sectionId } }
  if (isPublished && !hasScheduledPublish) createData.publishedAt = new Date()
  if (hasScheduledPublish) createData.scheduledAt = new Date(scheduledAt)

  await prisma.announcement.create({ data: createData })

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
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { schoolId: true, publishedAt: true },
  })
  if (!existing) return { error: "Announcement not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const audience = formData.get("audience") as string
  const classId = (formData.get("classId") as string) || undefined
  const sectionId = (formData.get("sectionId") as string) || undefined
  const isPublished = formData.get("isPublished") !== "false"
  const scheduledAt = (formData.get("scheduledAt") as string) || undefined

  const hasScheduledPublish = scheduledAt && new Date(scheduledAt) > new Date()

  const updateData: any = {
    title,
    content,
    audience,
    isPublished: hasScheduledPublish ? false : isPublished,
  }
  if (classId) updateData.class = { connect: { id: classId } }
  else updateData.classId = null
  if (sectionId) updateData.section = { connect: { id: sectionId } }
  else updateData.sectionId = null
  if (isPublished && !hasScheduledPublish) updateData.publishedAt = new Date()
  else updateData.publishedAt = existing.publishedAt
  if (hasScheduledPublish) updateData.scheduledAt = new Date(scheduledAt)
  else updateData.scheduledAt = null

  await prisma.announcement.update({
    where: { id: announcementId },
    data: updateData,
  })

  revalidatePath("/dashboard/announcements")
  return { success: true, error: undefined }
}

export async function deleteAnnouncement(announcementId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Announcement not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.announcement.delete({ where: { id: announcementId } })
  revalidatePath("/dashboard/announcements")
  return { success: true }
}

export async function getAnnouncements(
  schoolId: string,
  branchId: string,
  filters?: { audience?: string; authorId?: string },
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  )

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  return prisma.announcement.findMany({
    where: {
      schoolId: effectiveSchoolId,
      ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
      isPublished: true,
      ...(filters?.audience && { audience: filters.audience }),
      ...(filters?.authorId && { authorId: filters.authorId }),
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
      attachments: true,
      class: true,
      section: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAnnouncementById(announcementId: string) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  )

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
      attachments: true,
      class: true,
      section: true,
    },
  })
  if (!announcement) return null
  if (profile.role !== "SUPER_ADMIN" && announcement.schoolId !== profile.schoolId) return null

  return announcement
}

export async function getAnnouncementsForUser() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  )

  const now = new Date()

  const where: any = {
    schoolId: profile.schoolId!,
    isPublished: true,
    publishedAt: { lte: now },
    OR: [
      { audience: "ALL" },
      { audience: "SCHOOL" },
      ...(profile.branchId ? [{ audience: "BRANCH", branchId: profile.branchId }] : []),
      ...(profile.role === "TEACHER" ? [{ audience: "TEACHERS" }] : []),
      ...(profile.role === "STUDENT" ? [{ audience: "STUDENTS" }] : []),
      ...(profile.role === "PARENT" ? [{ audience: "PARENTS" }] : []),
    ],
  }

  if (profile.branchId) {
    where.branchId = profile.branchId
  }

  return prisma.announcement.findMany({
    where,
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
      attachments: true,
      reads: { where: { profileId: profile.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function markAnnouncementAsRead(announcementId: string) {
  const user = await requireAuth()

  const existing = await prisma.announcementRead.findUnique({
    where: { announcementId_profileId: { announcementId, profileId: user.id } },
  })

  if (!existing) {
    await prisma.announcementRead.create({
      data: { announcementId, profileId: user.id },
    })
  }

  revalidatePath("/dashboard/announcements")
  return { success: true }
}

export async function getAnnouncementReadStats(announcementId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const user = await requireAuth()
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { schoolId: true },
  })

  const totalProfiles = await prisma.profile.count({
    where: { schoolId: profile?.schoolId || "", isActive: true },
  })

  const readCount = await prisma.announcementRead.count({
    where: { announcementId },
  })

  return { totalProfiles, readCount, unreadCount: totalProfiles - readCount }
}

export async function addAnnouncementAttachment(
  announcementId: string,
  fileName: string,
  fileUrl: string,
  fileSize?: number,
  fileType?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Announcement not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.announcementAttachment.create({
    data: {
      announcementId,
      fileName,
      fileUrl,
      fileSize: fileSize || null,
      fileType: fileType || null,
    },
  })

  revalidatePath("/dashboard/announcements")
  return { success: true, error: undefined }
}

export async function deleteAnnouncementAttachment(attachmentId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.announcementAttachment.findUnique({
    where: { id: attachmentId },
    include: { announcement: { select: { schoolId: true } } },
  })
  if (!existing) return { error: "Attachment not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.announcement.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.announcementAttachment.delete({ where: { id: attachmentId } })
  revalidatePath("/dashboard/announcements")
  return { success: true }
}

export async function publishScheduledAnnouncements() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const now = new Date()
  const scheduled = await prisma.announcement.findMany({
    where: {
      isPublished: false,
      scheduledAt: { lte: now },
      ...(profile.role !== "SUPER_ADMIN" ? { schoolId: profile.schoolId! } : {}),
    },
  })

  if (scheduled.length > 0) {
    const ids = scheduled.map((a) => a.id)
    await prisma.announcement.updateMany({
      where: { id: { in: ids } },
      data: {
        isPublished: true,
        publishedAt: now,
        scheduledAt: null,
      },
    })
  }

  revalidatePath("/dashboard/announcements")
  return { published: scheduled.length }
}
