import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: { select: { firstName: true, lastName: true, email: true, admissionNo: true } },
        academicSession: { select: { name: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, schoolId: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (profile.role !== "SUPER_ADMIN") {
      const invoiceSchool = await prisma.student.findUnique({
        where: { id: invoice.studentId },
        select: { schoolId: true },
      })
      if (!invoiceSchool || invoiceSchool.schoolId !== profile.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      return NextResponse.json({ error: "Invoice is not payable" }, { status: 400 })
    }

    const remaining =
      Number(invoice.totalAmount) +
      Number(invoice.lateFee) -
      Number(invoice.paidAmount) -
      Number(invoice.discountAmount)

    if (remaining <= 0) {
      return NextResponse.json({ error: "No amount due" }, { status: 400 })
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: invoice.student.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `School Fee - ${invoice.invoiceNumber}`,
              description: `Fee for ${invoice.student.firstName} ${invoice.student.lastName} (${invoice.student.admissionNo}) - ${invoice.academicSession.name}`,
            },
            unit_amount: Math.round(remaining * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard/fees/invoices?payment=success&invoice=${invoice.invoiceNumber}`,
      cancel_url: `${origin}/dashboard/fees/invoices?payment=cancelled&invoice=${invoice.invoiceNumber}`,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        schoolId: invoice.studentId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
