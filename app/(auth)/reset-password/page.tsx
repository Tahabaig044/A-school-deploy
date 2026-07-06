import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  )
}
