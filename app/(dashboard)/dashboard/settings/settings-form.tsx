"use client"

import { useActionState } from "react"
import { updateSchool } from "@/actions/school.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

type School = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
}

export function SettingsForm({
  school,
  profileRole,
}: {
  school: School | null
  profileRole: string
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      if (!school) return { error: "No school found" }
      try {
        await updateSchool(school.id, formData)
        toast.success("School profile updated")
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Update failed"
        toast.error(msg)
        return { error: msg }
      }
    },
    null,
  )

  if (profileRole === "SUPER_ADMIN" && !school) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">
            No school profile found. Create a school from the Schools page first.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!school) return null

  return (
    <form action={formAction} className="grid max-w-2xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">School Name</Label>
            <Input id="name" name="name" defaultValue={school.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">School Code</Label>
            <Input id="code" name="code" defaultValue={school.code} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={school.address ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={school.phone ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={school.email ?? ""} />
          </div>
          {state && "error" in state && state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
