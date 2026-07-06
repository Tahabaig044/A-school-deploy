"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSubject } from "@/actions/subject.actions"

export function SubjectForm() {
  const [state, formAction, pending] = useActionState(createSubject, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Subject</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="name">Subject Name *</Label>
            <Input id="name" name="name" placeholder="e.g. Mathematics" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">Subject Code *</Label>
            <Input id="code" name="code" placeholder="e.g. MATH" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="CORE">
              <option value="CORE">Core</option>
              <option value="ELECTIVE">Elective</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Subject"}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
