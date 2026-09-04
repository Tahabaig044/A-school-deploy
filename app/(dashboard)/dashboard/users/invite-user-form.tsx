"use client"

import { useState } from "react"
import { useActionState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, Copy, Mail } from "lucide-react"
import { inviteUser } from "@/actions/auth.actions"
import type { Role } from "@/lib/constants"

const INVITABLE_ROLES: { value: Role; label: string }[] = [
  { value: "SCHOOL_ADMIN", label: "School Admin" },
  { value: "BRANCH_ADMIN", label: "Branch Admin" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "ADMISSION_OFFICER", label: "Admission Officer" },
  { value: "LIBRARIAN", label: "Librarian" },
  { value: "TRANSPORT_MANAGER", label: "Transport Manager" },
]

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(inviteUser, null)
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
            Invitation Sent!
          </CardTitle>
          <CardDescription>Share this link with the user to set their password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted flex items-center gap-2 rounded-md p-3">
            <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
            <code className="flex-1 text-sm break-all">{state.invitationLink}</code>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
              {copied ? (
                <>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            This link expires in 24 hours. The user will set their password and activate their
            account.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Invite Another User
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Invite User</CardTitle>
        <CardDescription>Send an invitation. The user will set their own password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {state?.error && (
            <div className="bg-destructive/10 rounded-md p-3">
              <p className="text-destructive text-sm">{state.error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              name="role"
              required
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select role...</option>
              {INVITABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending invitation..." : "Send Invitation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
