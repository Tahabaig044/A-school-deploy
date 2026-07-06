"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getUnreadNotificationCount } from "@/actions/notification.actions"

export function NotificationsDropdown() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    getUnreadNotificationCount()
      .then((c) => setCount(c))
      .catch(() => setCount(0))
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-4 text-center text-sm text-muted-foreground">
          {count > 0 ? `You have ${count} unread notification${count === 1 ? "" : "s"}` : "No new notifications"}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
