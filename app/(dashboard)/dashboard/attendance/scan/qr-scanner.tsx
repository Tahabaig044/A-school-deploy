"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { markAttendanceByQr } from "@/actions/attendance-qr.actions"
import { Camera, CameraOff, CheckCircle2, XCircle, Loader2, ScanLine } from "lucide-react"
import type { Html5Qrcode } from "html5-qrcode"

export function QrScanner({
  classes,
  sessions,
  schoolId,
}: {
  classes: any[]
  sessions: any[]
  schoolId: string
}) {
  const [classId, setClassId] = useState("")
  const [sectionId, setSectionId] = useState("")
  const [sessionId, setSessionId] = useState(sessions[0]?.id || "")
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)
  const [recentScans, setRecentScans] = useState<{ id: string; time: string; status: string }[]>([])
  const readerRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)

  const selectedClass = classes.find((c) => c.id === classId)

  const startScanner = useCallback(async () => {
    if (!classId || !sessionId || !readerRef.current) return

    try {
      const { Html5Qrcode } = await import("html5-qrcode")

      const qrScanner = new Html5Qrcode("qr-reader")
      setScanner(qrScanner)

      await qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (processingRef.current) return
          processingRef.current = true

          try {
            const result = await markAttendanceByQr(
              decodedText,
              classId,
              sectionId || null,
              sessionId,
            )

            if (result.success) {
              setLastResult({
                success: true,
                message: result.studentName
                  ? `Marked: ${result.studentName}`
                  : "Attendance marked!",
              })
              setRecentScans((prev) => [
                {
                  id: decodedText.slice(0, 10),
                  time: new Date().toLocaleTimeString(),
                  status: "PRESENT",
                },
                ...prev.slice(0, 19),
              ])
            } else {
              setLastResult({ success: false, message: result.error || "Failed" })
            }
          } catch {
            setLastResult({ success: false, message: "Invalid QR code" })
          }

          setTimeout(() => {
            processingRef.current = false
          }, 1500)
        },
        () => {},
      )

      setScanning(true)
    } catch (err) {
      console.error("Camera error:", err)
      setLastResult({ success: false, message: "Camera access denied or unavailable" })
    }
  }, [classId, sectionId, sessionId])

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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QR Scanner</CardTitle>
                <CardDescription>Position QR code in front of camera</CardDescription>
              </div>
              {lastResult && (
                <Badge
                  variant={lastResult.success ? "success" : "destructive"}
                  className="px-3 py-1 text-sm"
                >
                  {lastResult.success ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {lastResult.message}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scan-class">Class</Label>
                  <Select
                    value={classId}
                    onValueChange={(v) => {
                      setClassId(v ?? "")
                      if (scanning) stopScanner()
                    }}
                  >
                    <SelectTrigger id="scan-class" className="w-44">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClass?.sections?.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="scan-section">Section</Label>
                    <Select
                      value={sectionId}
                      onValueChange={(v) => {
                        setSectionId(v ?? "")
                        if (scanning) stopScanner()
                      }}
                    >
                      <SelectTrigger id="scan-section" className="w-36">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {selectedClass.sections.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="scan-session">Session</Label>
                  <Select
                    value={sessionId}
                    onValueChange={(v) => {
                      setSessionId(v ?? "")
                      if (scanning) stopScanner()
                    }}
                  >
                    <SelectTrigger id="scan-session" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                id="qr-reader"
                ref={readerRef}
                className={`bg-muted mx-auto w-full max-w-md overflow-hidden rounded-lg border ${
                  scanning ? "" : "flex items-center justify-center"
                }`}
                style={{ minHeight: scanning ? "auto" : "200px" }}
              >
                {!scanning && (
                  <div className="text-muted-foreground p-8 text-center">
                    <ScanLine className="mx-auto mb-3 h-12 w-12 opacity-40" />
                    <p>Select class and start scanner</p>
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
                  <Button onClick={startScanner} disabled={!classId || !sessionId}>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Scanner
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Last 20 scans this session</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentScans.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">No scans yet</div>
            ) : (
              <div className="divide-y">
                {recentScans.map((scan, i) => (
                  <div
                    key={`${scan.id}-${i}`}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="font-mono text-xs">{scan.id}</span>
                    <span className="text-muted-foreground text-xs">{scan.time}</span>
                    <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                      PRESENT
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
