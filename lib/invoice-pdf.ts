import { prisma } from "@/lib/prisma"
import { escapeHtml } from "@/lib/html-escape"

export async function generateInvoicePDF(invoiceId: string): Promise<string> {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          admissionNo: true,
          email: true,
          phone: true,
          address: true,
        },
      },
      academicSession: { select: { name: true } },
      items: {
        include: { feeStructure: { select: { name: true, category: true } } },
      },
      payments: {
        select: {
          receiptNumber: true,
          amount: true,
          paymentDate: true,
          paymentMode: true,
          referenceNumber: true,
        },
        orderBy: { paymentDate: "desc" },
      },
    },
  })

  if (!invoice) throw new Error("Invoice not found")

  const school = await prisma.school.findUnique({
    where: { id: invoice.studentId },
    select: { name: true, address: true, phone: true, email: true, logoUrl: true },
  })

  const totalDue =
    Number(invoice.totalAmount) +
    Number(invoice.lateFee) -
    Number(invoice.discountAmount)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 20px; }
        .school-info h1 { font-size: 24px; color: #0066cc; }
        .school-info p { color: #666; margin-top: 4px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 20px; color: #0066cc; }
        .invoice-title p { color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-box { background: #f8f9fa; padding: 12px; border-radius: 4px; }
        .info-box h3 { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #0066cc; color: white; padding: 10px 8px; text-align: left; font-size: 11px; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f8f9fa; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
        .totals-box { width: 250px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .totals-row.total { border-top: 2px solid #0066cc; font-weight: bold; font-size: 14px; padding-top: 8px; margin-top: 4px; }
        .footer { text-align: center; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .status-PAID { background: #d4edda; color: #155724; }
        .status-PARTIAL { background: #fff3cd; color: #856404; }
        .status-PENDING { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="school-info">
            <h1>${escapeHtml(school?.name || "School Name")}</h1>
            <p>${escapeHtml(school?.address || "")}</p>
            <p>Phone: ${escapeHtml(school?.phone || "")} | Email: ${escapeHtml(school?.email || "")}</p>
          </div>
          <div class="invoice-title">
            <h2>FEE INVOICE</h2>
            <p>Invoice #: ${escapeHtml(invoice.invoiceNumber)}</p>
            <p>Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
            <span class="status status-${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Student Information</h3>
            <p><strong>${escapeHtml(invoice.student.firstName)} ${escapeHtml(invoice.student.lastName)}</strong></p>
            <p>Admission #: ${escapeHtml(invoice.student.admissionNo)}</p>
            ${invoice.student.phone ? `<p>Phone: ${escapeHtml(invoice.student.phone)}</p>` : ""}
            ${invoice.student.email ? `<p>Email: ${escapeHtml(invoice.student.email)}</p>` : ""}
          </div>
          <div class="info-box">
            <h3>Invoice Details</h3>
            <p><strong>Session:</strong> ${escapeHtml(invoice.academicSession.name)}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            ${invoice.notes ? `<p><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</p>` : ""}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fee Description</th>
              <th>Category</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(item.feeStructure.name)}</td>
                <td>${escapeHtml(item.feeStructure.category)}</td>
                <td style="text-align:right">$${Number(item.amount).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-box">
            <div class="totals-row">
              <span>Total Amount:</span>
              <span>$${Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Discount:</span>
              <span>-$${Number(invoice.discountAmount).toFixed(2)}</span>
            </div>
            ${Number(invoice.lateFee) > 0
              ? `<div class="totals-row"><span>Late Fee:</span><span>+$${Number(invoice.lateFee).toFixed(2)}</span></div>`
              : ""}
            <div class="totals-row">
              <span>Paid:</span>
              <span>-$${Number(invoice.paidAmount).toFixed(2)}</span>
            </div>
            <div class="totals-row total">
              <span>Amount Due:</span>
              <span>$${Math.max(0, totalDue - Number(invoice.paidAmount)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${
          invoice.payments.length > 0
            ? `
          <h3 style="margin-bottom: 10px; font-size: 13px;">Payment History</h3>
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Reference</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.payments
                .map(
                  (p) => `
                <tr>
                  <td>${escapeHtml(p.receiptNumber)}</td>
                  <td>${new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td>${escapeHtml(p.paymentMode.replace(/_/g, " "))}</td>
                  <td>${escapeHtml(p.referenceNumber || "—")}</td>
                  <td style="text-align:right">$${Number(p.amount).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `
            : ""
        }

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a computer-generated invoice. No signature required.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return html
}

export async function generateInvoicePDFBuffer(invoiceId: string): Promise<Buffer> {
  const html = await generateInvoicePDF(invoiceId)

  const { default: html2pdf } = await import("html2pdf.js")

  return new Promise((resolve, reject) => {
    html2pdf()
      .set({
        margin: 10,
        filename: `invoice-${invoiceId}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(html)
      .outputPdf("buffer")
      .then((buffer: Buffer) => resolve(buffer))
      .catch((err: Error) => reject(err))
  })
}
