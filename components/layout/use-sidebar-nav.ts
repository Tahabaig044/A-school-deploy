"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  sidebarModules,
  filterModulesByPermissions,
  getAllMenuHrefs,
  resolveActiveHref,
  isPathActive,
  type SidebarModule,
} from "@/lib/menu-items"

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed"

export function useSidebarNav(permissions: string[], pathname: string) {
  const permsKey = permissions.join("|")

  const modules = useMemo(
    () => filterModulesByPermissions(sidebarModules, permissions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permsKey],
  )

  const hrefs = useMemo(() => getAllMenuHrefs(modules), [modules])

  // Longest matching href wins, so /dashboard/exams does not light up
  // while the user is on /dashboard/exams/schedule
  const activeHref = useMemo(() => resolveActiveHref(pathname, hrefs), [pathname, hrefs])

  const [search, setSearch] = useState("")
  const [pref, setPref] = useState({ collapsed: false, hydrated: false })
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  // Reading the persisted preference must happen after mount, otherwise the
  // server markup and the first client render would disagree.
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true"
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPref({ collapsed: stored, hydrated: true })
  }, [])

  const collapsed = pref.collapsed
  const hydrated = pref.hydrated
  const setCollapsed = useCallback((next: boolean | ((c: boolean) => boolean)) => {
    setPref((prev) => ({
      hydrated: true,
      collapsed: typeof next === "function" ? next(prev.collapsed) : next,
    }))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed))
  }, [collapsed, hydrated])

  const autoOpenLabels = useMemo(() => {
    if (!activeHref) return new Set<string>()
    const group = modules.find((m) => m.links.some((l) => l.href === activeHref))
    return new Set(group ? [group.label] : [])
  }, [activeHref, modules])

  const isTreeOpen = useCallback(
    (label: string) => overrides[label] ?? autoOpenLabels.has(label),
    [overrides, autoOpenLabels],
  )

  const toggleTree = useCallback(
    (label: string) => {
      setOverrides((prev) => ({
        ...prev,
        [label]: !(prev[label] ?? autoOpenLabels.has(label)),
      }))
    },
    [autoOpenLabels],
  )

  const openTree = useCallback((label: string) => {
    setOverrides((prev) => (prev[label] === true ? prev : { ...prev, [label]: true }))
  }, [])

  const query = search.trim().toLowerCase()

  const filteredModules = useMemo<SidebarModule[]>(() => {
    if (!query) return modules
    return modules
      .map((module) => ({
        ...module,
        links: module.links.filter(
          (link) =>
            link.label.toLowerCase().includes(query) ||
            module.label.toLowerCase().includes(query),
        ),
      }))
      .filter((module) => module.links.length > 0)
  }, [modules, query])

  return {
    modules,
    filteredModules,
    activeHref,
    isActive: useCallback((href: string) => href === activeHref, [activeHref]),
    isPathActive,
    search,
    setSearch,
    isTreeOpen,
    toggleTree,
    openTree,
    collapsed,
    setCollapsed,
  }
}
