"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { signup } from "@/actions/auth.actions"

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signup, null)

  if (state?.success) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Check your email for a confirmation link.
      </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">I am a</Label>
        <select
          id="role"
          name="role"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="STUDENT">Student</option>
          <option value="PARENT">Parent</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account..." : "Create Account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
