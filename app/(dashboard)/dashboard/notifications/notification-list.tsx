"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/actions/notification.actions"
import { useToast } from "@/hooks/use-toast"
import { Bell, Check, CheckCheck, Trash2, Filter } from "lucide-react"

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "GENERAL", label: "General" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "FEE", label: "Fees" },
  { value: "EVENT", label: "Events" },
  { value: "MEETING", label: "Meetings" },
  { value: "MESSAGE", label: "Messages" },
]

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
}

export function NotificationList({
  notifications,
  unreadCount,
  page,
  totalPages,
  total,
  activeCategory,
}: {
  notifications: any[]
  unreadCount: number
  page: number
  totalPages: number
  total: number
  activeCategory: string
}) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleMarkAsRead(id: string) {
    await markNotificationAsRead(id)
    router.refresh()
  }

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead()
    toast({ title: "All notifications marked as read" })
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteNotification(id)
    toast({ title: "Notification deleted" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Notification center and history">
        <Button variant="outline" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </PageHeader>

      <Tabs
        value={activeCategory}
        onValueChange={(v) => router.push(`/dashboard/notifications?category=${v}`)}
      >
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-2">
              {cat.label}
              {cat.value === "all" && unreadCount > 0 && (
                <Badge className="ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 ${
                  !notification.isRead ? "border-l-primary bg-primary/5 border-l-4" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Bell className="text-muted-foreground h-4 w-4" />
                      <span className="font-medium">{notification.title}</span>
                      <Badge
                        variant="outline"
                        className={PRIORITY_COLORS[notification.priority] || ""}
                      >
                        {notification.priority}
                      </Badge>
                      <Badge variant="secondary">{notification.category}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{notification.content}</p>
                    <span className="text-muted-foreground text-xs">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() =>
              router.push(`/dashboard/notifications?category=${activeCategory}&page=${page - 1}`)
            }
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(`/dashboard/notifications?category=${activeCategory}&page=${page + 1}`)
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
