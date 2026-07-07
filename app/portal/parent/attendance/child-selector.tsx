"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Child {
  id: string
  firstName: string
  lastName: string
}

interface ChildSelectorProps {
  children: Child[]
  selectedId: string
  month: number
}

export function ChildSelector({ children, selectedId, month }: ChildSelectorProps) {
  const router = useRouter()

  return (
    <Select
      value={selectedId}
      onValueChange={(value) => {
        router.push(`/portal/parent/attendance?student=${value}&month=${month}`)
      }}
    >
      <SelectTrigger className="w-full max-w-sm">
        <SelectValue placeholder="Select a child" />
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.firstName} {child.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
