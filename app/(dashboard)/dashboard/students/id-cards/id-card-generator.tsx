"use client"

import { useState } from "react"
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
import { getBulkStudentIdCardDataAction } from "@/actions/id-card.actions"
import type { IdCardData } from "@/services/id-card"
import { Download, Loader2, IdCard, Printer, QrCode } from "lucide-react"

export function IdCardGenerator({
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
  const [cards, setCards] = useState<IdCardData[]>([])
  const [loading, setLoading] = useState(false)

  const selectedClass = classes.find((c) => c.id === classId)

  const loadCards = async () => {
    if (!classId) return
    setLoading(true)
    const data = await getBulkStudentIdCardDataAction(
      schoolId,
      classId,
      sectionId || undefined,
      sessionId || undefined,
    )
    setCards(data)
    setLoading(false)
  }

  const bulkParams = new URLSearchParams({
    bulk: "1",
    schoolId,
    classId,
  })
  if (sectionId && sectionId !== "all") bulkParams.set("sectionId", sectionId)
  if (sessionId) bulkParams.set("sessionId", sessionId)
  const bulkPdfHref = `/api/id-card/pdf?${bulkParams.toString()}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>
            Choose a class and section to generate role-based ID cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select
                value={classId}
                onValueChange={(v) => {
                  setClassId(v ?? "")
                  setSectionId("")
                }}
              >
                <SelectTrigger id="class" className="w-48">
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
                <Label htmlFor="section">Section (optional)</Label>
                <Select value={sectionId} onValueChange={(v) => setSectionId(v ?? "")}>
                  <SelectTrigger id="section" className="w-48">
                    <SelectValue placeholder="All sections" />
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
              <Label htmlFor="session">Session</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger id="session" className="w-48">
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
            <Button onClick={loadCards} disabled={!classId || loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IdCard className="mr-2 h-4 w-4" />
              )}
              Generate ID Cards
            </Button>
          </div>
        </CardContent>
      </Card>

      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between print:hidden">
            <p className="text-muted-foreground text-sm">{cards.length} cards generated</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <a href={bulkPdfHref} target="_blank" rel="noopener noreferrer">
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Download All as PDF
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 justify-items-center gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
              <IdCardPreview key={card.userId} card={card} />
            ))}
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          nav,
          header,
          .print\\:hidden {
            display: none !important;
          }
          body {
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  )
}

function IdCardPreview({ card }: { card: IdCardData }) {
  return (
    <div className="relative flex w-[220px] flex-col items-center rounded-xl border bg-white p-3 text-center shadow-sm print:border-gray-300 print:shadow-none">
      <div className="mb-1 text-[10px] leading-tight font-bold tracking-wide text-gray-700 uppercase">
        {card.school.name}
      </div>
      <div className="mb-1 aspect-square w-[55%]">
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.photo}
            alt={card.name}
            className="h-full w-full rounded object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-gray-200">
            <IdCard className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="text-xs leading-tight font-semibold">{card.name}</div>
      <Badge variant="info" className="mt-1 text-[10px]">
        {card.cardNumber}
      </Badge>
      {card.details
        .filter((d) => d.value)
        .slice(0, 2)
        .map((d) => (
          <div key={d.label} className="text-muted-foreground text-[9px]">
            {d.label}: {d.value}
          </div>
        ))}
      {card.qrToken ? (
        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[9px]">
          <QrCode className="h-3 w-3" /> QR Ready
        </div>
      ) : (
        <div className="text-muted-foreground mt-1 text-[9px]">
          QR unavailable (no linked account)
        </div>
      )}
    </div>
  )
}
