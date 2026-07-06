import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { MessageList } from "./message-list"

const PAGE_SIZE = 20

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const tab = params.tab || "inbox"
  const skip = (page - 1) * PAGE_SIZE

  const [inbox, sent, unreadCount, inboxTotal, sentTotal] = await Promise.all([
    prisma.message.findMany({
      where: { receiverId: profile.id },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: tab === "inbox" ? skip : 0,
      take: tab === "inbox" ? PAGE_SIZE : undefined,
    }),
    prisma.message.findMany({
      where: { senderId: profile.id },
      include: {
        receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: tab === "sent" ? skip : 0,
      take: tab === "sent" ? PAGE_SIZE : undefined,
    }),
    prisma.message.count({
      where: { receiverId: profile.id, isRead: false },
    }),
    prisma.message.count({ where: { receiverId: profile.id } }),
    prisma.message.count({ where: { senderId: profile.id } }),
  ])

  const total = tab === "inbox" ? inboxTotal : sentTotal
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <MessageList
      inbox={JSON.parse(JSON.stringify(inbox))}
      sent={JSON.parse(JSON.stringify(sent))}
      unreadCount={unreadCount}
      profile={JSON.parse(JSON.stringify(profile))}
      page={page}
      totalPages={totalPages}
      total={total}
      activeTab={tab}
    />
  )
}
