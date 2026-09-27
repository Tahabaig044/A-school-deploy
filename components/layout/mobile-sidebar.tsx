"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, ChevronDown, Search } from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSidebarNav } from "@/components/layout/use-sidebar-nav"

type MobileSidebarProps = {
  permissions: string[]
}

export function MobileSidebar({ permissions }: MobileSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const {
    filteredModules,
    isActive,
    search,
    setSearch,
    isTreeOpen,
    toggleTree,
  } = useSidebarNav(permissions, pathname)

  function handleNavigate() {
    setOpen(false)
    setSearch("")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" onClick={handleNavigate}>
            <h1 className="text-lg font-semibold">SchoolMS</h1>
          </Link>
        </div>

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

        <nav className="flex-1 overflow-y-auto px-2 pb-6">
          <ul className="space-y-0.5">
            {filteredModules.map((module) => {
              const groupActive = module.links.some((l) => isActive(l.href))
              const isOpen = isTreeOpen(module.label)
              const isSingleLink = module.links.length === 1

              if (isSingleLink) {
                const link = module.links[0]
                return (
                  <li key={module.label}>
                    <Link
                      href={link.href}
                      onClick={handleNavigate}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive(link.href)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <module.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  </li>
                )
              }

              return (
                <li key={module.label}>
                  <button
                    type="button"
                    onClick={() => toggleTree(module.label)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      groupActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <module.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">{module.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <ul
                    className={cn(
                      "ml-5 space-y-0.5 overflow-hidden border-l pl-2 transition-all duration-200 ease-out",
                      isOpen ? "mt-0.5 max-h-[40rem] opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    {module.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={handleNavigate}
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
      </SheetContent>
    </Sheet>
  )
}
