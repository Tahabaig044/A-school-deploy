"use client"

import { useState } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, Copy, Mail } from "lucide-react"
import { createStaff } from "@/actions/staff.actions"

export function StaffForm() {
  const [state, formAction, pending] = useActionState(createStaff, null)
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
            Staff Created Successfully!
          </CardTitle>
          <CardDescription>
            Share this invitation link with the staff member to set their password.
          </CardDescription>
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
            This link expires in 24 hours. The staff member will set their password and activate
            their account.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Add Another Staff Member
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Staff</CardTitle>
        <CardDescription>
          Creating a staff member will also create their login account and send an invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid max-w-lg gap-4">
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
            <Label htmlFor="employeeCode">Employee Code *</Label>
            <Input id="employeeCode" name="employeeCode" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="department">Department *</Label>
              <Input
                id="department"
                name="department"
                placeholder="e.g. Admin, Accounts, Transport"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="designation">Designation *</Label>
              <Input id="designation" name="designation" required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="joiningDate">Joining Date</Label>
            <Input id="joiningDate" name="joiningDate" type="date" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Staff"}
          </Button>
          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
