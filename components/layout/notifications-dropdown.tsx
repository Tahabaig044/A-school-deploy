"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/actions/notification.actions"
import { useToast } from "@/hooks/use-toast"

export function NotificationsDropdown({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Sync when the RSC layout refreshes with a new server-computed count.
  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    if (open) {
      getNotifications(5)
        .then((n) => setNotifications(n))
        .catch(() => setNotifications([]))
    }
  }, [open])

  async function handleMarkAsRead(id: string) {
    await markNotificationAsRead(id)
    setCount((c) => Math.max(0, c - 1))
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    router.refresh()
  }

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead()
    setCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    toast({ title: "All notifications marked as read" })
    router.refresh()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {count > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 ${
                  !notification.isRead ? "bg-primary/5" : ""
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOpen(false)
              router.push("/dashboard/notifications")
            }}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
