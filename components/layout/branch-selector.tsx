"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Branch = {
  id: string
  name: string
}

function getInitialBranch(branches: Branch[]): string {
  if (branches.length === 0) return ""
  if (typeof document === "undefined") return branches[0].id
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("selected_branch="))
  return cookie ? cookie.split("=")[1] : branches[0].id
}

export function BranchSelector({ branches }: { branches: Branch[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState(() => getInitialBranch(branches))

  const handleChange = useCallback(
    (value: string | null) => {
      if (!value) return
      setSelected(value)
      document.cookie = `selected_branch=${value}; path=/; max-age=86400; SameSite=Lax`
      router.refresh()
    },
    [router]
  )

  if (branches.length === 0) return null

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
