import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"

async function TeacherMessagesContent() {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) redirect("/login")
  if (userRole !== "TEACHER") redirect("/dashboard")

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile: { id: userId, role: "TEACHER" as any, schoolId: null, branchId: null, firstName: null, lastName: null, email: userEmail, phone: null },
  })

  try {
    const messages = await prisma.message.findMany({
      where: { receiverId: userId },
      include: {
        sender: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const unreadCount = messages.filter((m) => !m.isRead).length

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "All messages read"}
          </p>
        </div>
        {messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No messages</p>
              <p className="text-sm text-muted-foreground">No messages found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <Card key={msg.id} className={msg.isRead ? "" : "border-l-4 border-l-primary"}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">
                      From: {msg.sender.firstName} {msg.sender.lastName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {!msg.isRead && <Badge variant="default" className="text-xs">New</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {msg.subject && (
                    <CardDescription className="font-medium">{msg.subject}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{msg.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default function TeacherMessagesPage() {
  return <TeacherMessagesContent />
}
