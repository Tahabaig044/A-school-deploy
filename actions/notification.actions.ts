"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function createNotification(
  userId: string,
  title: string,
  content: string,
  type: string,
  link?: string,
  category: string = "GENERAL",
  priority: string = "NORMAL"
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  await prisma.notification.create({
    data: { userId, title, content, type, link, category, priority },
  })

  return { success: true }
}

export async function markNotificationAsRead(notificationId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.notification.update({
    where: { id: notificationId, userId: profile.id },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath("/dashboard")
  revalidatePath("/portal/teacher")
  revalidatePath("/portal/student")
  revalidatePath("/portal/parent")
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.notification.updateMany({
    where: { userId: profile.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath("/dashboard")
  revalidatePath("/portal/teacher")
  revalidatePath("/portal/student")
  revalidatePath("/portal/parent")
  return { success: true }
}

export async function getNotifications(limit?: number, category?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.notification.findMany({
    where: {
      userId: profile.id,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit || 50,
  })
}

export async function getNotificationHistory(page: number = 1, pageSize: number = 20) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const skip = (page - 1) * pageSize

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({
      where: { userId: profile.id },
    }),
  ])

  return {
    notifications,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  }
}

export async function getUnreadNotificationCount() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.notification.count({
    where: { userId: profile.id, isRead: false },
  })
}

export async function deleteNotification(notificationId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.notification.delete({
    where: { id: notificationId, userId: profile.id },
  })

  revalidatePath("/dashboard")
  revalidatePath("/portal/teacher")
  revalidatePath("/portal/student")
  revalidatePath("/portal/parent")
  return { success: true }
}
