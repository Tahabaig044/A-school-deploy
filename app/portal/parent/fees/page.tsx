import { getParentChildren, getChildFees } from "@/actions/parent-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, ChevronDown, ChevronRight, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

function formatCurrency(amount: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(amount),
  )
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function ParentFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentId } = await searchParams
  const children = await getParentChildren()

  if (!studentId) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Student Fees</h1>
        <p className="text-muted-foreground mb-4">Select a child to view their fees.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/portal/parent/fees?student=${child.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                      <DollarSign className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-muted-foreground text-sm">View fees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const { invoices, summary } = await getChildFees(studentId)
  const selectedChild = children.find((c) => c.id === studentId)

  if (!summary) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Fees</h1>
        <p className="text-muted-foreground py-8 text-center">No fee data available.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/parent/fees">
            <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}'s Fees` : "Fees"}
        </h1>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalDue)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalPaid)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.invoiceCount}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No invoices found.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InvoiceRow({
  invoice,
}: {
  invoice: {
    id: string
    invoiceNumber: string
    invoiceDate: string | Date
    dueDate: string | Date
    totalAmount: unknown
    paidAmount: unknown
    status: string
    items: { id: string; feeStructure: { name: string }; amount: unknown }[]
    payments: { id: string; amount: unknown; paymentDate: string | Date; paymentMode: string }[]
  }
}) {
  const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount)

  return (
    <details className="rounded-lg border">
      <summary className="hover:bg-muted/50 flex cursor-pointer items-center gap-4 rounded-lg p-4 select-none">
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform open:rotate-180" />
        <div className="grid flex-1 grid-cols-2 items-center gap-2 text-sm sm:grid-cols-6">
          <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
          <span className="text-muted-foreground hidden sm:block">
            {formatDate(invoice.invoiceDate)}
          </span>
          <span className="text-muted-foreground hidden sm:block">
            {formatDate(invoice.dueDate)}
          </span>
          <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
          <span className="text-muted-foreground hidden sm:block">
            {formatCurrency(invoice.paidAmount)}
          </span>
          <Badge
            className={statusColors[invoice.status] || "bg-gray-100 text-gray-800"}
            variant="secondary"
          >
            {invoice.status}
          </Badge>
        </div>
      </summary>
      <div className="space-y-4 border-t px-4 pt-2 pb-4">
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">Items</h4>
          <div className="space-y-1">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.feeStructure.name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 text-sm font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
        {invoice.payments.length > 0 && (
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              Payment History
            </h4>
            <div className="space-y-1">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(payment.paymentDate)} &middot; {payment.paymentMode}
                  </span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                <span>Balance Due</span>
                <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
