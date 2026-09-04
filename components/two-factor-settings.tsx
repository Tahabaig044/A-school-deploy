"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Shield, ShieldCheck, ShieldOff, QrCode, Loader2 } from "lucide-react"
import {
  initiateTwoFactorSetup,
  confirmTwoFactorSetup,
  turnOffTwoFactor,
} from "@/actions/two-factor.actions"

interface TwoFactorSettingsProps {
  twoFactorEnabled: boolean
}

export function TwoFactorSettings({ twoFactorEnabled }: TwoFactorSettingsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [showSetup, setShowSetup] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleInitiateSetup() {
    startTransition(async () => {
      try {
        const result = await initiateTwoFactorSetup()
        setQrDataUrl(result.qrDataUrl)
        setSecret(result.secret)
        setShowSetup(true)
        setError(null)
      } catch {
        toast({ title: "Failed to initiate 2FA setup", variant: "destructive" })
      }
    })
  }

  async function handleConfirmSetup(formData: FormData) {
    const result = await confirmTwoFactorSetup(null, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowSetup(false)
      setQrDataUrl(null)
      setSecret(null)
      setToken("")
      setError(null)
      toast({ title: "2FA enabled successfully" })
      router.refresh()
    }
  }

  async function handleDisable() {
    startTransition(async () => {
      const result = await turnOffTwoFactor()
      if (result?.error) {
        toast({ title: result.error, variant: "destructive" })
      } else {
        setShowDisable(false)
        toast({ title: "2FA disabled" })
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {twoFactorEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security with TOTP-based verification
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          {twoFactorEnabled ? (
            <Button variant="destructive" size="sm" onClick={() => setShowDisable(true)}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Disable
            </Button>
          ) : (
            <Button size="sm" onClick={handleInitiateSetup} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Enable 2FA
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrDataUrl && (
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="2FA QR Code" className="h-48 w-48" />
              </div>
            )}
            {secret && (
              <div className="rounded-lg bg-muted p-3">
                <p className="mb-1 text-xs text-muted-foreground">Manual entry key:</p>
                <p className="font-mono text-sm break-all">{secret}</p>
              </div>
            )}
            <form action={handleConfirmSetup} className="space-y-3">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="2fa-token">Enter 6-digit code from your app</Label>
                <Input
                  id="2fa-token"
                  name="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Verify & Enable
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
            <DialogDescription>
              This will remove the extra security layer from your account. You can re-enable it
              anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDisable(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
