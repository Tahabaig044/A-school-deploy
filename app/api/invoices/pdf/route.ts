import { NextRequest, NextResponse } from "next/server"
import { generateInvoicePDF } from "@/lib/invoice-pdf"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      select: { studentId: true, student: { select: { branchId: true } } },
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

    const html = await generateInvoicePDF(invoiceId)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="invoice-${invoiceId}.html"`,
      },
    })
  } catch (error) {
    console.error("Invoice PDF error:", error)
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 })
  }
}
