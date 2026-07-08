"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSession } from "@/actions/session.actions"

export function SessionForm({
  branches,
}: {
  branches: { id: string; name: string }[]
}) {
  const [, formAction, pending] = useActionState(createSession, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Academic Session</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="name">Session Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. 2025-2026"
              required
            />
          </div>
          {branches.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch (optional)</Label>
              <Select name="branchId">
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isCurrent" name="isCurrent" />
            <Label htmlFor="isCurrent">Set as current session</Label>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Session"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
