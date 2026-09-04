"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Eye, EyeOff, CheckCircle, GraduationCap } from "lucide-react"
import { acceptInvitation, getInvitationByToken } from "@/actions/auth.actions"
import Link from "next/link"

export function SetupPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [state, formAction, pending] = useActionState(acceptInvitation, null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.")
      setLoading(false)
      return
    }

    getInvitationByToken(token).then((result) => {
      if (result.error) {
        setError(result.error)
      } else {
        setInvitation(result.profile)
      }
      setLoading(false)
    })
  }, [token])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-primary h-8 w-8" />
          <h1 className="text-2xl font-bold">SchoolMS</h1>
        </div>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-primary h-8 w-8" />
          <h1 className="text-2xl font-bold">SchoolMS</h1>
        </div>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-primary text-sm hover:underline">
                Go to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-primary h-8 w-8" />
          <h1 className="text-2xl font-bold">SchoolMS</h1>
        </div>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <p className="font-medium">Password set successfully!</p>
            <p className="text-muted-foreground mt-1 text-sm">
              You can now sign in with your email and password.
            </p>
            <Link href="/login" className="mt-4 inline-block">
              <Button className="mt-4 w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="text-primary h-8 w-8" />
        <h1 className="text-2xl font-bold">SchoolMS</h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set Your Password</CardTitle>
          <CardDescription>
            Welcome, {invitation?.firstName} {invitation?.lastName}!
            <br />
            Create a password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="token" value={token || ""} />

            {state?.error && (
              <div className="bg-destructive/10 rounded-md p-3">
                <p className="text-destructive text-sm">{state.error}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={invitation?.email || ""} disabled />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Input
                value={invitation?.role?.replace("_", " ") || ""}
                disabled
                className="capitalize"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
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

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Setting password..." : "Set Password & Activate Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
