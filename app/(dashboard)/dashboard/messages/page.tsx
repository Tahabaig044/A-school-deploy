import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { MessageList } from "./message-list"

export default async function MessagesPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const [inbox, sent, unreadCount] = await Promise.all([
    prisma.message.findMany({
      where: { receiverId: profile.id },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { senderId: profile.id },
      include: {
        receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.count({
      where: { receiverId: profile.id, isRead: false },
    }),
  ])

  return (
    <MessageList
      inbox={JSON.parse(JSON.stringify(inbox))}
      sent={JSON.parse(JSON.stringify(sent))}
      unreadCount={unreadCount}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
