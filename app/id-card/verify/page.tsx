import { requireIdCardVerifier } from "@/services/id-card"
import { QrVerifier } from "@/components/id-card/qr-verifier"

export default async function VerifyIdCardPage() {
  await requireIdCardVerifier()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Verify ID Card</h2>
        <p className="text-muted-foreground">
          Scan or paste an ID card token to verify its holder and status
        </p>
      </div>
      <QrVerifier />
    </div>
  )
}
