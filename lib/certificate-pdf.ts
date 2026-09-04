import { prisma } from "@/lib/prisma"

export async function generateTransferCertificate(studentId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          academicSession: { select: { name: true } },
        },
        orderBy: { enrollmentDate: "desc" },
        take: 1,
      },
      school: {
        select: { name: true, address: true, phone: true, email: true, logoUrl: true },
      },
    },
  })

  if (!student) throw new Error("Student not found")

  const enrollment = student.enrollments[0]
  const school = student.school

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Georgia, serif; }
        .certificate {
          max-width: 800px; margin: 40px auto; padding: 60px;
          border: 3px double #333; background: #fff;
          position: relative;
        }
        .watermark {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 80px; color: rgba(0,0,0,0.03); font-weight: bold; white-space: nowrap;
          pointer-events: none;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 28px; color: #1a5276; margin-bottom: 5px; }
        .header p { color: #666; font-size: 12px; }
        .title { text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0; text-decoration: underline; }
        .body { font-size: 14px; line-height: 2; margin: 20px 0; text-align: justify; }
        .detail-row { display: flex; margin: 8px 0; }
        .detail-label { width: 180px; font-weight: bold; }
        .detail-value { flex: 1; border-bottom: 1px dotted #ccc; }
        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature { text-align: center; }
        .signature-line { width: 200px; border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
        .date { text-align: right; margin-top: 20px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="watermark">TRANSFER CERTIFICATE</div>
        <div class="header">
          <h1>${school?.name || "School Name"}</h1>
          <p>${school?.address || ""}</p>
          <p>Phone: ${school?.phone || ""} | Email: ${school?.email || ""}</p>
        </div>
        <div class="title">TRANSFER CERTIFICATE</div>
        <div class="body">
          <p>This is to certify that <strong>${student.firstName} ${student.lastName}</strong></p>
          <div class="detail-row">
            <span class="detail-label">Admission Number:</span>
            <span class="detail-value">${student.admissionNo || "N/A"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date of Birth:</span>
            <span class="detail-value">${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Gender:</span>
            <span class="detail-value">${student.gender}</span>
          </div>
          ${enrollment ? `
          <div class="detail-row">
            <span class="detail-label">Class/Section:</span>
            <span class="detail-value">${enrollment.class.name} - ${enrollment.section?.name || "N/A"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Academic Session:</span>
            <span class="detail-value">${enrollment.academicSession.name}</span>
          </div>
          ` : ""}
          <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span class="detail-value">${student.address || "N/A"}</span>
          </div>
          <p style="margin-top: 20px;">
            was a bonafide student of this school. The school guarantees the above student's
            character and conduct during the period of study.
          </p>
          <p>
            This certificate is issued at the request of the student/parent for the purpose of
            seeking admission to another school/institution.
          </p>
        </div>
        <div class="date">Date of Issue: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Principal's Signature</div>
          </div>
          <div class="signature">
            <div class="signature-line">School Seal</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return html
}

export async function generateStudentCertificate(studentId: string, type: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
        orderBy: { enrollmentDate: "desc" },
        take: 1,
      },
      school: {
        select: { name: true, address: true, phone: true, email: true },
      },
    },
  })

  if (!student) throw new Error("Student not found")

  const enrollment = student.enrollments[0]
  const school = student.school

  const title = type === "bonafide" ? "BONAFIDE CERTIFICATE" :
    type === "character" ? "CHARACTER CERTIFICATE" :
    "CERTIFICATE"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Georgia, serif; }
        .certificate {
          max-width: 800px; margin: 40px auto; padding: 60px;
          border: 3px double #333; background: #fff;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 28px; color: #1a5276; }
        .header p { color: #666; font-size: 12px; }
        .title { text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0; text-decoration: underline; }
        .body { font-size: 14px; line-height: 2; text-align: justify; }
        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature { text-align: center; }
        .signature-line { width: 200px; border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <h1>${school?.name || "School Name"}</h1>
          <p>${school?.address || ""}</p>
        </div>
        <div class="title">${title}</div>
        <div class="body">
          <p>This is to certify that <strong>${student.firstName} ${student.lastName}</strong>
          (Admission No: ${student.admissionNo || "N/A"}) is a bonafide student of this school,
          studying in <strong>${enrollment?.class?.name || "N/A"} - ${enrollment?.section?.name || "N/A"}</strong>.</p>
        </div>
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Principal's Signature</div>
          </div>
          <div class="signature">
            <div class="signature-line">School Seal</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return html
}
