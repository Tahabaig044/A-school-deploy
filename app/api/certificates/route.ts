import { NextRequest, NextResponse } from "next/server"
import { generateTransferCertificate, generateStudentCertificate } from "@/lib/certificate-pdf"
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
    const studentId = searchParams.get("studentId")
    const type = searchParams.get("type") || "tc"

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, schoolId: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (profile.role !== "SUPER_ADMIN") {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { schoolId: true },
      })
      if (!student || student.schoolId !== profile.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    let html: string
    if (type === "tc") {
      html = await generateTransferCertificate(studentId)
    } else {
      html = await generateStudentCertificate(studentId, type)
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("Certificate error:", error)
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 })
  }
}
