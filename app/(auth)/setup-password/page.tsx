"use client"

import { Suspense } from "react"
import { SetupPasswordForm } from "./setup-password-form"

function SetupPasswordFallback() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">SchoolMS</h1>
      </div>
      <div className="w-full max-w-sm p-6 border rounded-lg">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<SetupPasswordFallback />}>
      <SetupPasswordForm />
    </Suspense>
  )
}
