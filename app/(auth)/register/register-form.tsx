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
      <div className="text-muted-foreground text-center text-sm">
        Check your email for a confirmation link.
      </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="STUDENT">Student</option>
          <option value="PARENT">Parent</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account..." : "Create Account"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="hover:text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  )
}
