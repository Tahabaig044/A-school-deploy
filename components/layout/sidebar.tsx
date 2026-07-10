"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { menuItems, filterMenuItemsByPermissions } from "@/lib/menu-items"

type SidebarProps = {
  permissions: string[]
}

export function Sidebar({ permissions }: SidebarProps) {
  const items = filterMenuItemsByPermissions(menuItems, permissions)
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r h-full">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard">
          <h1 className="text-lg font-semibold">SchoolMS</h1>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
