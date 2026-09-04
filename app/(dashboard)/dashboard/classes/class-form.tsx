"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClass } from "@/actions/class.actions"

export function ClassForm() {
  const [state, formAction, pending] = useActionState(createClass, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Class</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" name="name" placeholder="e.g. Class 1" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">Class Code</Label>
            <Input id="code" name="code" placeholder="e.g. 1" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="order">Display Order</Label>
            <Input id="order" name="order" type="number" defaultValue="0" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Class"}
          </Button>
          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
