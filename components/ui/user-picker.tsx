"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { searchUsers } from "@/actions/user-search.actions"
import type { SearchUserResult } from "@/actions/user-search.actions"
import { Search, X, Check, ChevronDown, User } from "lucide-react"

const ROLE_OPTIONS = [
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent" },
  { value: "STAFF", label: "Staff" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "SCHOOL_ADMIN", label: "School Admin" },
  { value: "BRANCH_ADMIN", label: "Branch Admin" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "ADMISSION_OFFICER", label: "Admission Officer" },
  { value: "LIBRARIAN", label: "Librarian" },
  { value: "TRANSPORT_MANAGER", label: "Transport Manager" },
]

let userCache = new Map<string, { name: string; role: string }>()

export function UserPicker({
  name,
  selected,
  onChange,
  multiple = false,
  placeholder = "Search users by name, email, or ID...",
  roleFilter = true,
  excludeIds,
}: {
  name: string
  selected: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  placeholder?: string
  roleFilter?: boolean
  excludeIds?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchUserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Map<string, { name: string; role: string }>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const roleRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef(0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    const fetchId = ++lastFetchRef.current
    setLoading(true)
    try {
      const filters: { roles?: string[] } = {}
      if (selectedRole) {
        filters.roles = [selectedRole]
      }
      const data = await searchUsers(q, filters)
      if (fetchId !== lastFetchRef.current) return
      const filtered = excludeIds ? data.filter((u) => !excludeIds.includes(u.profileId || u.id)) : data
      setResults(filtered)
      const cacheUpdates: [string, { name: string; role: string }][] = []
      for (const u of filtered) {
        const uid = u.profileId || u.id
        if (!userCache.has(uid)) {
          cacheUpdates.push([uid, { name: u.name, role: u.role }])
        }
      }
      if (cacheUpdates.length > 0) {
        userCache = new Map([...userCache, ...cacheUpdates])
      }
    } catch {
      setResults([])
    } finally {
      if (fetchId === lastFetchRef.current) setLoading(false)
    }
  }, [selectedRole, excludeIds])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  useEffect(() => {
    const updated = new Map(selectedUsers)
    let changed = false
    for (const id of selected) {
      if (!updated.has(id) && userCache.has(id)) {
        updated.set(id, userCache.get(id)!)
        changed = true
      }
    }
    for (const id of updated.keys()) {
      if (!selected.includes(id)) {
        updated.delete(id)
        changed = true
      }
    }
    if (changed) setSelectedUsers(updated)
  }, [selected])

  function handleSelect(user: SearchUserResult) {
    const userId = user.profileId || user.id
    if (multiple) {
      if (selected.includes(userId)) {
        onChange(selected.filter((id) => id !== userId))
      } else {
        onChange([...selected, userId])
      }
    } else {
      onChange([userId])
      setOpen(false)
      setQuery("")
    }
  }

  function handleRemove(userId: string) {
    onChange(selected.filter((id) => id !== userId))
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((id) => {
            const info = selectedUsers.get(id) || userCache.get(id)
            return (
              <Badge key={id} variant="secondary" className="gap-1 max-w-full">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{info?.name || id.slice(0, 8) + "..."}</span>
                <span className="text-[10px] opacity-60 shrink-0">{info?.role?.replace("_", " ")}</span>
                <button type="button" onClick={() => handleRemove(id)} className="ml-0.5 hover:text-destructive shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        {roleFilter && (
          <div ref={roleRef} className="relative">
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1 border rounded px-3 py-2 text-sm hover:bg-muted whitespace-nowrap"
            >
              {selectedRole ? ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label || selectedRole : "All Roles"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showRoleDropdown && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-popover border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => { setSelectedRole(""); setShowRoleDropdown(false) }}
                >
                  All Roles
                </button>
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${selectedRole === role.value ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedRole(role.value); setShowRoleDropdown(false) }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            className="pl-9"
          />
        </div>
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No users found</div>
          ) : (
            results.map((user) => {
              const userId = user.profileId || user.id
              const isSelected = selected.includes(userId)
              return (
                <button
                  key={userId}
                  type="button"
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted text-sm ${isSelected ? "bg-muted/50" : ""}`}
                  onClick={() => handleSelect(user)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{user.name}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                        {user.role.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.identifier && <span className="mr-2">{user.identifier}</span>}
                      {user.email && <span>{user.email}</span>}
                      {user.class && <span className="ml-2">Class: {user.class}{user.section ? ` - ${user.section}` : ""}</span>}
                      {user.department && <span className="ml-2">Dept: {user.department}</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
