"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"
import { z } from "zod"

const messageSchema = z.object({
  schoolId: z.string().uuid(),
  receiverId: z.string().uuid(),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
})

export async function sendMessage(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT")

  const schoolId = getSchoolId(profile, formData, "Send Message")
  const receiverId = formData.get("receiverId") as string
  const subject = formData.get("subject") as string || undefined
  const content = formData.get("content") as string

  const parsed = messageSchema.safeParse({ schoolId, receiverId, subject, content })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.message.create({
    data: {
      school: { connect: { id: schoolId } },
      sender: { connect: { id: profile.id } },
      receiver: { connect: { id: receiverId } },
      subject, content,
    },
  })

  revalidatePath("/dashboard/messages")
  return { success: true, error: undefined }
}

export async function markMessageAsRead(messageId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.message.update({
    where: { id: messageId, receiverId: profile.id },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath("/dashboard/messages")
  return { success: true }
}

export async function getInboxMessages() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.findMany({
    where: { receiverId: profile.id },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getSentMessages() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT")

  return prisma.message.findMany({
    where: { senderId: profile.id },
    include: {
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMessageById(messageId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [
        { senderId: profile.id },
        { receiverId: profile.id },
      ],
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })

  if (message && message.receiverId === profile.id && !message.isRead) {
    await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() },
    })
  }

  return message
}

export async function getUnreadMessageCount() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.count({
    where: { receiverId: profile.id, isRead: false },
  })
}
