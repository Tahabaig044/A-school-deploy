import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { NotificationList } from "./notification-list"

const PAGE_SIZE = 20

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "PARENT",
    "STUDENT",
  )
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const category = params.category || "all"
  const skip = (page - 1) * PAGE_SIZE

  const categoryFilter = category !== "all" ? { category } : {}

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: profile.id,
        ...categoryFilter,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({
      where: {
        userId: profile.id,
        ...categoryFilter,
      },
    }),
    prisma.notification.count({
      where: {
        userId: profile.id,
        isRead: false,
      },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <NotificationList
      notifications={JSON.parse(JSON.stringify(notifications))}
      unreadCount={unreadCount}
      page={page}
      totalPages={totalPages}
      total={total}
      activeCategory={category}
    />
  )
}
