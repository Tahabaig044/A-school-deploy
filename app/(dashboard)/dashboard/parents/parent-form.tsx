"use client"

import { useState } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, Copy, Mail } from "lucide-react"
import { addParent } from "@/actions/parent.actions"

export function ParentForm() {
  const [state, formAction, pending] = useActionState(addParent, null)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    if (state?.invitationLink) {
      await navigator.clipboard.writeText(state.invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (state?.success && state?.invitationLink) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Parent Created Successfully!
          </CardTitle>
          <CardDescription>
            Share this invitation link with the parent to set their password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-sm break-all flex-1">{state.invitationLink}</code>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
              {copied ? <><CheckCircle className="h-4 w-4 mr-1" />Copied!</> : <><Copy className="h-4 w-4 mr-1" />Copy Link</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">This link expires in 24 hours.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Add Another Parent</Button>
        </CardContent>
      </Card>
    )
  }

  if (state?.success && !state?.invitationLink) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Parent Added Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>Add Another Parent</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Parent</CardTitle>
        <CardDescription>Add a parent and optionally link to a student</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="relationship">Relationship *</Label>
            <select id="relationship" name="relationship" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
              <option value="GUARDIAN">Guardian</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (for portal access)</Label>
              <Input id="email" name="email" type="email" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" name="occupation" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="isPrimary">Primary Contact</Label>
              <div className="flex items-center h-10">
                <input id="isPrimary" name="isPrimary" type="checkbox" className="h-4 w-4 rounded border-gray-300" />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" />
          </div>
          <p className="text-xs text-muted-foreground">To link this parent to a student, go to the student's profile page.</p>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Add Parent"}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
