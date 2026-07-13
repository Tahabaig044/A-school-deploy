import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MessageList } from "@/app/(dashboard)/dashboard/messages/message-list"

const PAGE_SIZE = 20

export default async function TeacherMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; search?: string }>
}) {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userSchoolId = headerStore.get("X-User-SchoolId")
  const userBranchId = headerStore.get("X-User-BranchId")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) redirect("/login")
  if (userRole !== "TEACHER") redirect("/dashboard")

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const tab = params.tab || "inbox"
  const search = params.search || ""
  const skip = (page - 1) * PAGE_SIZE

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true, role: true, schoolId: true, branchId: true, firstName: true, lastName: true, email: true, phone: true },
  })

  if (!profile) redirect("/login")

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile,
  })

  try {
    const searchFilter = search ? {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}

    const [inbox, sent, drafts, archived, starred, unreadCount, inboxTotal, sentTotal] = await Promise.all([
      prisma.message.findMany({
        where: { receiverId: userId, isDeleted: false, isDraft: false, ...searchFilter },
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: tab === "inbox" ? skip : 0,
        take: tab === "inbox" ? PAGE_SIZE : undefined,
      }),
      prisma.message.findMany({
        where: { senderId: userId, isDeleted: false, isDraft: false, ...searchFilter },
        include: { receiver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: tab === "sent" ? skip : 0,
        take: tab === "sent" ? PAGE_SIZE : undefined,
      }),
      prisma.message.findMany({
        where: { senderId: userId, isDraft: true },
        include: { receiver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }], isDeleted: true },
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } }, receiver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }], isStarred: true, isDeleted: false },
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } }, receiver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.count({ where: { receiverId: userId, isRead: false, isDeleted: false, isDraft: false } }),
      prisma.message.count({ where: { receiverId: userId, isDeleted: false, isDraft: false } }),
      prisma.message.count({ where: { senderId: userId, isDeleted: false, isDraft: false } }),
    ])

    const tabCounts = {
      inbox: inboxTotal,
      sent: sentTotal,
      drafts: await prisma.message.count({ where: { senderId: userId, isDraft: true } }),
      archived: await prisma.message.count({ where: { OR: [{ senderId: userId }, { receiverId: userId }], isDeleted: true } }),
      starred: await prisma.message.count({ where: { OR: [{ senderId: userId }, { receiverId: userId }], isStarred: true, isDeleted: false } }),
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
  } finally {
    clearRequestContext()
  }
}
