"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { recordPayment } from "@/actions/fees.actions"
import { useToast } from "@/hooks/use-toast"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PARTIAL: "default",
  PAID: "outline",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
}

const paymentModes = ["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"]

export function PaymentView({
  invoices,
  profile,
}: {
  invoices: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  async function handlePayment(formData: FormData) {
    const res = await recordPayment(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setSelectedInvoice("")
      setError(null)
      toast({ title: "Payment recorded successfully" })
      router.refresh()
    }
  }

  function openPaymentDialog(invoiceId: string) {
    setSelectedInvoice(invoiceId)
    setOpen(true)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="View invoices and record payments"
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/fees/invoices"><ArrowLeft className="mr-2 h-4 w-4" />Back to Invoices</Link>
        </Button>
      </PageHeader>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No invoices found. Select an invoice from the invoices page.
          </CardContent>
        </Card>
      ) : (
        invoices.map((invoice) => {
          const totalDue = Number(invoice.totalAmount) + Number(invoice.lateFee) - Number(invoice.discountAmount)
          const remaining = totalDue - Number(invoice.paidAmount)
          const isPaidOrCancelled = invoice.status === "PAID" || invoice.status === "CANCELLED"

          return (
            <Card key={invoice.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {invoice.student.firstName} {invoice.student.lastName} ({invoice.student.admissionNo}) — {invoice.academicSession.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={statusVariants[invoice.status]} className="text-sm px-3 py-1">
                    {invoice.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold">${Number(invoice.totalAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount</p>
                    <p className="text-lg font-bold">${Number(invoice.discountAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-lg font-bold text-green-600">${Number(invoice.paidAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className={`text-lg font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                      ${Math.max(0, remaining).toFixed(2)}
                    </p>
                  </div>
                </div>

                {invoice.items?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Invoice Items</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fee Structure</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.feeStructure.name}</TableCell>
                              <TableCell className="text-right">${Number(item.amount).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {invoice.payments?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Payment History</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Recorded By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.payments.map((payment: any) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                              <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                              <TableCell>{payment.paymentMode.replace(/_/g, " ")}</TableCell>
                              <TableCell className="text-right font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                              <TableCell>{payment.referenceNumber || "—"}</TableCell>
                              <TableCell>{payment.recorder.firstName} {payment.recorder.lastName}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {!isPaidOrCancelled && (
                  <Button onClick={() => openPaymentDialog(invoice.id)}>
                    <Plus className="mr-2 h-4 w-4" />Record Payment
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setError(null); setSelectedInvoice("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form action={handlePayment} className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <input type="hidden" name="invoiceId" value={selectedInvoice} />
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div>
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select name="paymentMode" defaultValue="CASH">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentModes.map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input id="referenceNumber" name="referenceNumber" placeholder="Cheque/Transaction ref" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <Button type="submit" className="w-full">Record Payment</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
