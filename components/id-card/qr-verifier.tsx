"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { verifyIdCardTokenAction } from "@/actions/id-card.actions"
import type { IdCardVerification } from "@/services/id-card"
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ScanLine,
  ShieldCheck,
} from "lucide-react"
import type { Html5Qrcode } from "html5-qrcode"

export function QrVerifier() {
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [tokenInput, setTokenInput] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<IdCardVerification | null>(null)
  const readerRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)

  const verify = useCallback(async (token: string) => {
    if (!token || processingRef.current) return
    processingRef.current = true
    setVerifying(true)
    setResult(null)
    try {
      const res = await verifyIdCardTokenAction(token)
      setResult(res)
    } catch {
      setResult({ verified: false, reason: "INVALID_TOKEN" })
    } finally {
      setVerifying(false)
      window.setTimeout(() => {
        processingRef.current = false
      }, 1200)
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!readerRef.current) return
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const qrScanner = new Html5Qrcode("id-card-qr-reader")
      setScanner(qrScanner)
      await qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await verify(decodedText)
        },
        () => {},
      )
      setScanning(true)
    } catch {
      setResult({ verified: false, reason: "INVALID_TOKEN" })
    }
  }, [verify])

  const stopScanner = useCallback(async () => {
    if (scanner) {
      try {
        await scanner.stop()
        await scanner.clear()
      } catch {}
      setScanner(null)
    }
    setScanning(false)
  }, [scanner])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>Position an ID card QR in front of the camera</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="id-card-qr-reader"
            ref={readerRef}
            className={`bg-muted mx-auto w-full max-w-md overflow-hidden rounded-lg border ${scanning ? "" : "flex items-center justify-center"}`}
            style={{ minHeight: scanning ? "auto" : "200px" }}
          >
            {!scanning && (
              <div className="text-muted-foreground p-8 text-center">
                <ScanLine className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p>Start the scanner to verify a card</p>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            {scanning ? (
              <Button variant="destructive" onClick={stopScanner}>
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Scanner
              </Button>
            ) : (
              <Button onClick={startScanner}>
                <Camera className="mr-2 h-4 w-4" />
                Start Scanner
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
            <CardDescription>Paste the token read from a card</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Card Token</Label>
              <Input
                id="token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste card token…"
                className="font-mono"
              />
            </div>
            <Button
              onClick={() => verify(tokenInput)}
              disabled={!tokenInput || verifying}
              className="w-full"
            >
              {verifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Verify Token
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Verification Result</CardTitle>
                {result.verified ? (
                  <Badge variant="success" className="px-3 py-1 text-sm">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="px-3 py-1 text-sm">
                    <XCircle className="mr-1 h-3 w-3" />
                    {result.reason || "Failed"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {result.verified && result.data ? (
                <div className="space-y-2 text-sm">
                  <div className="text-lg font-semibold">{result.data.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{result.data.role}</Badge>
                    <Badge variant="outline" className="font-mono">
                      {result.data.cardNumber}
                    </Badge>
                  </div>
                  <div className="pt-1">
                    <span className="text-muted-foreground">{result.data.identity.label}: </span>
                    <span className="font-medium">{result.data.identity.value}</span>
                  </div>
                  {result.data.school && (
                    <div>
                      <span className="text-muted-foreground">School: </span>
                      <span className="font-medium">{result.data.school.name}</span>
                    </div>
                  )}
                  {result.data.branch && (
                    <div>
                      <span className="text-muted-foreground">Branch: </span>
                      <span className="font-medium">{result.data.branch.name}</span>
                    </div>
                  )}
                  {result.data.details
                    .filter((d) => d.value)
                    .map((d) => (
                      <div key={d.label}>
                        <span className="text-muted-foreground">{d.label}: </span>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  <div className="text-muted-foreground pt-1 text-xs">
                    Attendance: {result.data.attendanceEligible ? "Eligible" : "Not eligible"}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This token could not be verified. The card may be invalid, revoked, or inactive.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
