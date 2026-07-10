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
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const schoolId = getSchoolId(profile, formData, "Send Message")
  const receiverIdsRaw = formData.get("receiverIds") as string
  let receiverId: string
  try {
    const ids = JSON.parse(receiverIdsRaw)
    receiverId = Array.isArray(ids) ? ids[0] : ids
  } catch {
    receiverId = receiverIdsRaw
  }
  const subject = formData.get("subject") as string || undefined
  const content = formData.get("content") as string
  const parentMessageId = formData.get("parentMessageId") as string || undefined

  const parsed = messageSchema.safeParse({ schoolId, receiverId, subject, content })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const messageData: any = {
    school: { connect: { id: schoolId } },
    sender: { connect: { id: profile.id } },
    receiver: { connect: { id: receiverId } },
    content,
  }

  if (subject) messageData.subject = subject
  if (parentMessageId) {
    messageData.parentMessage = { connect: { id: parentMessageId } }
  }

  await prisma.message.create({ data: messageData })

  revalidatePath("/dashboard/messages")
  revalidatePath("/portal/teacher/messages")
  revalidatePath("/portal/student/messages")
  return { success: true, error: undefined }
}

export async function saveDraft(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const schoolId = getSchoolId(profile, formData, "Save Draft")
  const receiverIdsRaw = formData.get("receiverIds") as string
  let receiverId: string
  try {
    const ids = JSON.parse(receiverIdsRaw)
    receiverId = Array.isArray(ids) ? ids[0] || profile.id : profile.id
  } catch {
    receiverId = receiverIdsRaw || profile.id
  }
  const subject = formData.get("subject") as string || undefined
  const content = formData.get("content") as string

  const draftData: any = {
    school: { connect: { id: schoolId } },
    sender: { connect: { id: profile.id } },
    receiver: { connect: { id: receiverId || profile.id } },
    content,
    isDraft: true,
  }

  if (subject) draftData.subject = subject

  await prisma.message.create({ data: draftData })

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

export async function toggleStarMessage(messageId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [
        { senderId: profile.id },
        { receiverId: profile.id },
      ],
    },
  })

  if (!message) throw new Error("Message not found")

  await prisma.message.update({
    where: { id: messageId },
    data: { isStarred: !message.isStarred },
  })

  revalidatePath("/dashboard/messages")
  return { success: true }
}

export async function deleteMessage(messageId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.message.update({
    where: {
      id: messageId,
      OR: [
        { senderId: profile.id },
        { receiverId: profile.id },
      ],
    },
    data: { isDeleted: true },
  })

  revalidatePath("/dashboard/messages")
  return { success: true }
}

export async function restoreMessage(messageId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.message.update({
    where: {
      id: messageId,
      OR: [
        { senderId: profile.id },
        { receiverId: profile.id },
      ],
    },
    data: { isDeleted: false },
  })

  revalidatePath("/dashboard/messages")
  return { success: true }
}

export async function getInboxMessages(search?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.findMany({
    where: {
      receiverId: profile.id,
      isDeleted: false,
      isDraft: false,
      ...(search ? {
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
          { sender: { firstName: { contains: search, mode: "insensitive" } } },
          { sender: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getSentMessages(search?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.findMany({
    where: {
      senderId: profile.id,
      isDeleted: false,
      isDraft: false,
      ...(search ? {
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
          { receiver: { firstName: { contains: search, mode: "insensitive" } } },
          { receiver: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: {
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getDraftMessages() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.findMany({
    where: {
      senderId: profile.id,
      isDraft: true,
    },
    include: {
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getArchivedMessages() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: profile.id },
        { receiverId: profile.id },
      ],
      isDeleted: true,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getStarredMessages() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: profile.id },
        { receiverId: profile.id },
      ],
      isStarred: true,
      isDeleted: false,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
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
      replies: {
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      parentMessage: {
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
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
    where: {
      receiverId: profile.id,
      isRead: false,
      isDeleted: false,
      isDraft: false,
    },
  })
}

export async function getMessageThread(messageId: string) {
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
    },
  })

  if (!message) return null

  const thread = await prisma.message.findMany({
    where: {
      OR: [
        { id: messageId },
        { parentMessageId: messageId },
      ],
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return thread
}
