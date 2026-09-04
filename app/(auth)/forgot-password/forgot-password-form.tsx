"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { forgotPassword } from "@/actions/auth.actions"

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPassword, null)

  if (state?.success) {
    return (
      <div className="text-muted-foreground text-center text-sm">
        Check your email for a reset link.
      </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send Reset Link"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Remember your password?{" "}
        <Link href="/login" className="hover:text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  )
}
