"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { PortalNavList } from "./portal-sidebar"
import { getPortalMenuItemsForRole } from "@/lib/portal-menu-items"
import { usePathname } from "next/navigation"
import type { Role } from "@/lib/constants"

type PortalMobileSidebarProps = {
  role: Role
}

export function PortalMobileSidebar({ role }: PortalMobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const items = getPortalMenuItemsForRole(role)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/portal" onClick={() => setOpen(false)}>
            <h1 className="text-lg font-semibold">SchoolMS Portal</h1>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <PortalNavList items={items} pathname={pathname} onLinkClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
