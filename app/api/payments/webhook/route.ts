import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { logAuditEvent } from "@/lib/audit"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoiceId

    if (!invoiceId) {
      console.error("No invoiceId in session metadata")
      return NextResponse.json({ received: true })
    }

    try {
      const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } })
      if (!invoice) {
        console.error("Invoice not found:", invoiceId)
        return NextResponse.json({ received: true })
      }

      const paymentAmount = (session.amount_total || 0) / 100
      const count = await prisma.payment.count()
      const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`

      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            invoiceId,
            receiptNumber,
            amount: String(paymentAmount),
            paymentDate: new Date(),
            paymentMode: "ONLINE",
            referenceNumber: session.payment_intent as string,
            notes: `Stripe payment - Session: ${session.id}`,
            recordedBy: invoice.studentId,
          },
        })

        const updatedPaidAmount = Number(invoice.paidAmount) + paymentAmount
        const totalDue =
          Number(invoice.totalAmount) + Number(invoice.lateFee) - Number(invoice.discountAmount)
        const newStatus = updatedPaidAmount >= totalDue ? "PAID" : "PARTIAL"

        await tx.feeInvoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: String(updatedPaidAmount),
            status: newStatus,
          },
        })
      })

      await logAuditEvent({
        userId: invoice.studentId,
        action: "ONLINE_PAYMENT",
        entityType: "FeePayment",
        entityId: invoiceId,
        newValues: {
          amount: paymentAmount,
          receiptNumber,
          stripeSessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
      })
    } catch (error) {
      console.error("Error processing webhook:", error)
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
