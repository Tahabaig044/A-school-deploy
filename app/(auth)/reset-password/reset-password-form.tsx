"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { resetPassword } from "@/actions/auth.actions"

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, null)

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="grid gap-2">
        <Label htmlFor="password">New Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Resetting..." : "Reset Password"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="hover:text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
