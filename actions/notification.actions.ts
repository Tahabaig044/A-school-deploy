"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function createNotification(
  userId: string,
  title: string,
  content: string,
  type: string,
  link?: string
) {
  await prisma.notification.create({
    data: { userId, title, content, type, link },
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
  return { success: true }
}

export async function markAllNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getNotifications(userId: string, limit?: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit || 50,
  })
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

export async function deleteNotification(notificationId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.notification.delete({
    where: { id: notificationId, userId: profile.id },
  })

  revalidatePath("/dashboard")
  return { success: true }
}
