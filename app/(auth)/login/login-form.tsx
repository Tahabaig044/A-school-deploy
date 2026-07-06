"use client"

import { useState } from "react"
import { useActionState } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { signin } from "@/actions/auth.actions"

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signin, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="schoolCode">School Code</Label>
        <Input
          id="schoolCode"
          name="schoolCode"
          placeholder="Optional — leave blank if not applicable"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rememberMe"
          name="rememberMe"
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="rememberMe" className="text-sm font-normal">
          Remember me
        </Label>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}
