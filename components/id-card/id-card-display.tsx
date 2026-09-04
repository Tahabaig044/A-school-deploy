"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Printer,
  User,
  School,
  MapPin,
  Phone,
  Building2,
  ShieldCheck,
  Loader2,
  QrCode,
} from "lucide-react"
import type { IdCardData } from "@/services/id-card"
import { cn } from "@/lib/utils"

const STATUS_VARIANT: Record<
  IdCardData["cardStatus"],
  "success" | "secondary" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  EXPIRED: "warning",
  REVOKED: "destructive",
}

function roleLabel(role: IdCardData["role"]): string {
  switch (role) {
    case "SCHOOL_ADMIN":
      return "School Admin"
    case "SUPER_ADMIN":
      return "Super Admin"
    case "BRANCH_ADMIN":
      return "Branch Admin"
    default:
      return role.charAt(0) + role.slice(1).toLowerCase()
  }
}

export function IdCardDisplay({
  data,
  pdfHref,
  title = "My ID Card",
  description,
}: {
  data: IdCardData
  pdfHref: string
  title?: string
  description?: string
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (data.qrToken) {
      import("qrcode")
        .then((QRCode) =>
          QRCode.toDataURL(data.qrToken!, {
            margin: 1,
            width: 240,
            color: { dark: "#000000", light: "#ffffff" },
          }),
        )
        .then((url) => {
          if (!cancelled) setQrDataUrl(url)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [data.qrToken])

  const handleDownload = () => {
    setDownloading(true)
    const link = document.createElement("a")
    link.href = pdfHref
    link.download = ""
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => setDownloading(false), 1500)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>

        <div
          className="w-full max-w-3xl rounded-2xl border-2 bg-white p-6 shadow-sm print:border-gray-400 print:shadow-none"
          style={{ minHeight: "380px" }}
        >
          {/* School header */}
          <div className="mb-5 flex items-center justify-center gap-3">
            {data.school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.school.logoUrl}
                alt=""
                className="h-12 w-12 rounded-lg border object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <School className="text-primary h-6 w-6" />
              </div>
            )}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{data.school.name}</div>
              <div className="text-muted-foreground text-xs">
                {data.school.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {data.school.address}
                  </span>
                )}
                {data.school.phone && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {data.school.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:flex-row">
            {/* Photo */}
            <div className="flex-shrink-0">
              {data.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.photo}
                  alt={data.name}
                  className="h-44 w-36 rounded-xl border-2 border-gray-300 object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-44 w-36 items-center justify-center rounded-xl border-2 border-gray-300 bg-gray-100">
                  <User className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold">{data.name}</span>
                <Badge variant="info">{roleLabel(data.role)}</Badge>
                <Badge variant={STATUS_VARIANT[data.cardStatus]}>{data.cardStatus}</Badge>
              </div>

              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="text-muted-foreground h-4 w-4" />
                <span className="font-mono">{data.cardNumber}</span>
              </div>

              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="text-foreground font-medium">{data.identity.label}:</span>
                <span>{data.identity.value}</span>
              </div>

              {data.branch && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  <span>Branch: {data.branch.name}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 border-t pt-2 sm:grid-cols-2">
                {data.details
                  .filter((d) => d.value)
                  .map((d) => (
                    <div key={d.label} className="text-sm">
                      <span className="text-muted-foreground">{d.label}: </span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
              </div>

              {data.children.length > 0 && (
                <div className="border-t pt-2">
                  <div className="mb-1 text-sm font-semibold">Children</div>
                  <div className="flex flex-wrap gap-2">
                    {data.children.map((c) => (
                      <Badge key={c.id} variant="outline">
                        {c.name}
                        {c.className ? ` · ${c.className}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-muted-foreground pt-2 text-xs">
                <span>
                  Issued: {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : "N/A"}
                </span>
                <span className="mx-2">•</span>
                <span>
                  Valid:{" "}
                  {data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : "Lifetime"}
                </span>
                {!data.attendanceEligible && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Not eligible for attendance</span>
                  </>
                )}
              </div>
            </div>

            {/* QR */}
            <div className="flex flex-shrink-0 flex-col items-center justify-center">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Card QR" className="h-32 w-32 rounded-lg border p-1" />
              ) : (
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-lg border bg-gray-50 text-gray-400">
                  <QrCode className="h-10 w-10" />
                  <span className="mt-1 text-xs">
                    {data.qrToken ? "Loading QR…" : "QR unavailable"}
                  </span>
                </div>
              )}
              <span className="text-muted-foreground mt-1 text-xs">Scan to verify</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Download or print your ID card</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {downloading ? "Generating…" : "Download PDF"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print Card
            </Button>
            {data.qrToken && (
              <div
                className={cn(
                  "text-muted-foreground rounded-lg border p-3 text-xs",
                  "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
              >
                This card contains a secure QR token. Scanners can verify it without exposing
                personal data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
