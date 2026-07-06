"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSchool } from "@/actions/school.actions"

export function SchoolForm() {
  const [, formAction, pending] = useActionState(createSchool, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New School</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="name">School Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">School Code</Label>
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
            {pending ? "Creating..." : "Create School"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
