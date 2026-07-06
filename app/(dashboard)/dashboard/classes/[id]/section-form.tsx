"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSection } from "@/actions/class.actions"

export function SectionForm({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState(createSection, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Section</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-sm">
          <input type="hidden" name="classId" value={classId} />
          <div className="grid gap-2">
            <Label htmlFor="name">Section Name</Label>
            <Input id="name" name="name" placeholder="e.g. A" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" name="capacity" type="number" defaultValue="30" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add Section"}
          </Button>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
