"use client"

import { useState } from "react"
import { useActionState } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { signin } from "@/actions/auth.actions"
import { verifyTwoFactorLogin } from "@/actions/two-factor.actions"

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signin, null)
  const [showPassword, setShowPassword] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [twoFactorToken, setTwoFactorToken] = useState("")
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  async function handleTwoFactorVerify() {
    if (!userId || twoFactorToken.length !== 6) return
    setTwoFactorError(null)
    const valid = await verifyTwoFactorLogin(userId, twoFactorToken)
    if (valid) {
      window.location.href = "/dashboard"
    } else {
      setTwoFactorError("Invalid verification code")
    }
  }

  if (twoFactorRequired) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-10 w-10 text-primary" />
          <h3 className="text-lg font-semibold">Two-Factor Verification</h3>
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        {twoFactorError && (
          <div className="bg-destructive/10 rounded-md p-3">
            <p className="text-destructive text-sm">{twoFactorError}</p>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="twoFactorCode">Verification Code</Label>
          <Input
            id="twoFactorCode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-mono text-center text-lg tracking-widest"
            autoFocus
          />
        </div>
        <Button onClick={handleTwoFactorVerify} disabled={pending || twoFactorToken.length !== 6}>
          Verify
        </Button>
        <Button variant="ghost" onClick={() => { setTwoFactorRequired(false); setUserId(null) }}>
          Back to login
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && (
        <div className="bg-destructive/10 rounded-md p-3">
          <p className="text-destructive text-sm">{state.error}</p>
        </div>
      )}
      {state?.twoFactorRequired && state?.userId && (
        <div className="bg-primary/10 rounded-md p-3">
          <button
            type="button"
            onClick={() => {
              setTwoFactorRequired(true)
              setUserId(state.userId!)
            }}
            className="text-primary text-sm font-medium hover:underline"
          >
            Password verified. Click here to enter your 2FA code.
          </button>
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
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
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
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
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
          className="border-input h-4 w-4 rounded"
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
