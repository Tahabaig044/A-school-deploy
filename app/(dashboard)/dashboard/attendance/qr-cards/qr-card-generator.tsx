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
import { getStudentsForQrCards } from "@/actions/attendance-qr.actions"
import type { IdCardData } from "@/services/id-card"
import { Download, Printer, QrCode, Loader2, IdCard } from "lucide-react"

const QR_API = "/api/qr"

export function QrCardGenerator({
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
  const [cardSize, setCardSize] = useState<"small" | "large">("small")

  const selectedClass = classes.find((c) => c.id === classId)

  const loadCards = async () => {
    if (!classId) return
    setLoading(true)
    const data = await getStudentsForQrCards(
      schoolId,
      classId,
      sectionId || undefined,
      sessionId || undefined,
    )
    setCards(data)
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const cardW = cardSize === "small" ? 180 : 250
  const cardH = cardSize === "small" ? 260 : 340

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>
            Choose a class and section to generate QR attendance cards
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
            <div className="space-y-2">
              <Label htmlFor="size">Card Size</Label>
              <Select value={cardSize} onValueChange={(v) => setCardSize(v as any)}>
                <SelectTrigger id="size" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadCards} disabled={!classId || loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Generate Cards
            </Button>
          </div>
        </CardContent>
      </Card>

      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between print:hidden">
            <p className="text-muted-foreground text-sm">{cards.length} cards generated</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {cards.map((card) => (
              <QrCard key={card.userId} card={card} width={cardW} height={cardH} />
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

function QrCard({ card, width, height }: { card: IdCardData; width: number; height: number }) {
  const qrUrl = card.qrToken
    ? `${QR_API}?data=${encodeURIComponent(card.qrToken)}&size=${Math.min(width * 0.55, 140)}`
    : null

  return (
    <div
      className="flex flex-col items-center rounded-xl border bg-white p-3 text-center shadow-sm"
      style={{ width, minHeight: height }}
    >
      <div className="mb-1 text-[10px] leading-tight font-bold tracking-wide text-gray-700 uppercase">
        {card.school.name}
      </div>
      <div className="mb-1 aspect-square w-[55%]">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt={`QR for ${card.name}`}
            className="h-full w-full object-contain"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-gray-100">
            <IdCard className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="text-xs leading-tight font-semibold">{card.name}</div>
      {card.details.find((d) => d.label === "Roll No")?.value && (
        <div className="text-muted-foreground text-[10px]">
          Roll: {card.details.find((d) => d.label === "Roll No")?.value}
        </div>
      )}
      {card.details.find((d) => d.label === "Class")?.value && (
        <div className="text-muted-foreground text-[9px]">
          Class: {card.details.find((d) => d.label === "Class")?.value}
        </div>
      )}
      <div className="text-muted-foreground font-mono text-[9px]">{card.cardNumber}</div>
    </div>
  )
}
