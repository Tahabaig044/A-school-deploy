import { getParentChildren, getChildFees } from '@/actions/parent-portal.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, ChevronDown, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

function formatCurrency(amount: unknown) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function ParentFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: studentId } = await searchParams;
  const children = await getParentChildren();

  if (!studentId) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Student Fees</h1>
        <p className="text-muted-foreground mb-4">Select a child to view their fees.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/portal/parent/fees?student=${child.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{child.firstName} {child.lastName}</p>
                      <p className="text-sm text-muted-foreground">View fees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { invoices, summary } = await getChildFees(studentId);
  const selectedChild = children.find((c) => c.id === studentId);

  if (!summary) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Fees</h1>
        <p className="text-muted-foreground text-center py-8">No fee data available.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/parent/fees">
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}'s Fees` : 'Fees'}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalDue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle>
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
            <p className="text-muted-foreground text-center py-8">No invoices found.</p>
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
  );
}

function InvoiceRow({
  invoice,
}: {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string | Date;
    dueDate: string | Date;
    totalAmount: unknown;
    paidAmount: unknown;
    status: string;
    items: { id: string; feeStructure: { name: string }; amount: unknown }[];
    payments: { id: string; amount: unknown; paymentDate: string | Date; paymentMode: string }[];
  };
}) {
  const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);

  return (
    <details className="border rounded-lg">
      <summary className="flex items-center gap-4 p-4 cursor-pointer select-none hover:bg-muted/50 rounded-lg">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform open:rotate-180" />
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center text-sm">
          <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
          <span className="text-muted-foreground hidden sm:block">{formatDate(invoice.invoiceDate)}</span>
          <span className="text-muted-foreground hidden sm:block">{formatDate(invoice.dueDate)}</span>
          <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
          <span className="text-muted-foreground hidden sm:block">{formatCurrency(invoice.paidAmount)}</span>
          <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'} variant="secondary">
            {invoice.status}
          </Badge>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-2 border-t space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Items</h4>
          <div className="space-y-1">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.feeStructure.name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span>Total</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
        {invoice.payments.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Payment History</h4>
            <div className="space-y-1">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(payment.paymentDate)} &middot; {payment.paymentMode}
                  </span>
                  <span className="text-green-600 font-medium">-{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                <span>Balance Due</span>
                <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
