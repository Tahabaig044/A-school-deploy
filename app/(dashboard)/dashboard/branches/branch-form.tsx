"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBranch } from "@/actions/branch.actions"

export function BranchForm({ schoolId }: { schoolId?: string }) {
  const [, formAction, pending] = useActionState(createBranch, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Branch</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid max-w-md gap-4">
          {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}
          <div className="grid gap-2">
            <Label htmlFor="name">Branch Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">Branch Code</Label>
            <Input id="code" name="code" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Branch"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
