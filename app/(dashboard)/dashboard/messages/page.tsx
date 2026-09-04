import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { MessageList } from "./message-list"

const PAGE_SIZE = 20

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; search?: string }>
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
  const tab = params.tab || "inbox"
  const search = params.search || ""
  const skip = (page - 1) * PAGE_SIZE

  const searchFilter = search
    ? {
        OR: [
          { subject: { contains: search, mode: "insensitive" as const } },
          { content: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [inbox, sent, drafts, archived, starred, unreadCount, inboxTotal, sentTotal] =
    await Promise.all([
      prisma.message.findMany({
        where: {
          receiverId: profile.id,
          isDeleted: false,
          isDraft: false,
          ...searchFilter,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "inbox" ? skip : 0,
        take: tab === "inbox" ? PAGE_SIZE : undefined,
      }),
      prisma.message.findMany({
        where: {
          senderId: profile.id,
          isDeleted: false,
          isDraft: false,
          ...searchFilter,
        },
        include: {
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "sent" ? skip : 0,
        take: tab === "sent" ? PAGE_SIZE : undefined,
      }),
      prisma.message.findMany({
        where: {
          senderId: profile.id,
          isDraft: true,
        },
        include: {
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "drafts" ? skip : 0,
        take: tab === "drafts" ? PAGE_SIZE : undefined,
      }),
      prisma.message.findMany({
        where: {
          OR: [{ senderId: profile.id }, { receiverId: profile.id }],
          isDeleted: true,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "archived" ? skip : 0,
        take: tab === "archived" ? PAGE_SIZE : undefined,
      }),
      prisma.message.findMany({
        where: {
          OR: [{ senderId: profile.id }, { receiverId: profile.id }],
          isStarred: true,
          isDeleted: false,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "starred" ? skip : 0,
        take: tab === "starred" ? PAGE_SIZE : undefined,
      }),
      prisma.message.count({
        where: {
          receiverId: profile.id,
          isRead: false,
          isDeleted: false,
          isDraft: false,
        },
      }),
      prisma.message.count({ where: { receiverId: profile.id, isDeleted: false, isDraft: false } }),
      prisma.message.count({ where: { senderId: profile.id, isDeleted: false, isDraft: false } }),
    ])

  const tabCounts = {
    inbox: inboxTotal,
    sent: sentTotal,
    drafts: await prisma.message.count({ where: { senderId: profile.id, isDraft: true } }),
    archived: await prisma.message.count({
      where: {
        OR: [{ senderId: profile.id }, { receiverId: profile.id }],
        isDeleted: true,
      },
    }),
    starred: await prisma.message.count({
      where: {
        OR: [{ senderId: profile.id }, { receiverId: profile.id }],
        isStarred: true,
        isDeleted: false,
      },
    }),
  }

  const total = tabCounts[tab as keyof typeof tabCounts] || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <MessageList
      inbox={JSON.parse(JSON.stringify(inbox))}
      sent={JSON.parse(JSON.stringify(sent))}
      drafts={JSON.parse(JSON.stringify(drafts))}
      archived={JSON.parse(JSON.stringify(archived))}
      starred={JSON.parse(JSON.stringify(starred))}
      unreadCount={unreadCount}
      profile={JSON.parse(JSON.stringify(profile))}
      page={page}
      totalPages={totalPages}
      total={total}
      activeTab={tab}
      tabCounts={tabCounts}
      search={search}
    />
  )
}
