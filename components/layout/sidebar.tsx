"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Search, PanelLeftClose, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebarNav } from "@/components/layout/use-sidebar-nav"

type SidebarProps = {
  permissions: string[]
}

export function Sidebar({ permissions }: SidebarProps) {
  const pathname = usePathname()
  const {
    filteredModules,
    isActive,
    search,
    setSearch,
    isTreeOpen,
    toggleTree,
    openTree,
    collapsed,
    setCollapsed,
  } = useSidebarNav(permissions, pathname)

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "hidden h-full shrink-0 md:flex md:flex-col md:border-r bg-background",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
        {collapsed ? (
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
          >
            SM
          </Link>
        ) : (
          <Link href="/dashboard" className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">SchoolMS</h1>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              aria-label="Search menu"
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <ul className="space-y-0.5">
          {filteredModules.map((module) => {
            const groupActive = module.links.some((l) => isActive(l.href))
            const open = isTreeOpen(module.label)
            const isSingleLink = module.links.length === 1

            if (isSingleLink) {
              const link = module.links[0]
              return (
                <li key={module.label}>
                  <Link
                    href={link.href}
                    title={collapsed ? link.label : undefined}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      isActive(link.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <module.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{link.label}</span>}
                  </Link>
                </li>
              )
            }

            return (
              <li key={module.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false)
                      openTree(module.label)
                    } else {
                      toggleTree(module.label)
                    }
                  }}
                  title={collapsed ? module.label : undefined}
                  aria-expanded={open}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    groupActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <module.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{module.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      />
                    </>
                  )}
                </button>

                {!collapsed && (
                  <ul
                    className={cn(
                      "ml-5 space-y-0.5 overflow-hidden border-l pl-2 transition-all duration-200 ease-out",
                      open ? "mt-0.5 max-h-[40rem] opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    {module.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={isActive(link.href) ? "page" : undefined}
                          className={cn(
                            "block truncate rounded-md px-2.5 py-1.5 text-sm transition-colors",
                            isActive(link.href)
                              ? "bg-primary font-medium text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        {filteredModules.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No menu items match &quot;{search}&quot;.
          </p>
        )}
      </nav>
    </aside>
  )
}
