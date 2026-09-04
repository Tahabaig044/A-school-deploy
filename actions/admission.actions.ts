"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const admissionSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  appliedClassId: z.string().uuid("Invalid class"),
  academicSessionId: z.string().uuid("Invalid academic session"),
  previousSchool: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
})

const guardianSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
})

async function generateAdmissionNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.admission.count({
    where: { schoolId, createdAt: { gte: new Date(`${year}-01-01`) } },
  })
  return `ADM-${year}-${String(count + 1).padStart(5, "0")}`
}

export async function createAdmission(
  _prevState: { error?: string; success?: boolean; admissionId?: string } | null,
  formData: FormData,
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const schoolId = getSchoolId(profile, formData, "Create Admission")
  const branchId = getBranchId(profile, formData, "Create Admission")

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const dateOfBirth = formData.get("dateOfBirth") as string
  const gender = formData.get("gender") as string
  const bloodGroup = formData.get("bloodGroup") as string
  const religion = formData.get("religion") as string
  const nationality = formData.get("nationality") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const postalCode = formData.get("postalCode") as string
  const appliedClassId = formData.get("appliedClassId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const previousSchool = formData.get("previousSchool") as string
  const previousClass = formData.get("previousClass") as string
  const reason = formData.get("reason") as string

  const parsed = admissionSchema.safeParse({
    firstName,
    lastName,
    dateOfBirth,
    gender,
    bloodGroup,
    religion,
    nationality,
    phone,
    email,
    address,
    city,
    state,
    postalCode,
    appliedClassId,
    academicSessionId,
    previousSchool,
    previousClass,
    reason,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    const admissionNo = await generateAdmissionNumber(schoolId)

    const admission = await prisma.admission.create({
      data: {
        schoolId,
        branchId,
        admissionNo,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender as any,
        bloodGroup: bloodGroup || null,
        religion: religion || null,
        nationality: nationality || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        appliedClassId,
        academicSessionId,
        previousSchool: previousSchool || null,
        previousClass: previousClass || null,
        reason: reason || null,
      },
    })

    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Admission",
      entityId: admission.id,
      newValues: { admissionNo, firstName, lastName },
    })

    revalidatePath("/dashboard/admissions")
    return { success: true, error: undefined, admissionId: admission.id }
  } catch (e) {
    return { error: "Failed to create admission. Please try again.", success: false }
  }
}

export async function updateAdmission(
  admissionId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const existing = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Admission not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const dateOfBirth = formData.get("dateOfBirth") as string
  const gender = formData.get("gender") as string
  const bloodGroup = formData.get("bloodGroup") as string
  const religion = formData.get("religion") as string
  const nationality = formData.get("nationality") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const postalCode = formData.get("postalCode") as string
  const appliedClassId = formData.get("appliedClassId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const previousSchool = formData.get("previousSchool") as string
  const previousClass = formData.get("previousClass") as string
  const reason = formData.get("reason") as string

  const parsed = admissionSchema.safeParse({
    firstName,
    lastName,
    dateOfBirth,
    gender,
    bloodGroup,
    religion,
    nationality,
    phone,
    email,
    address,
    city,
    state,
    postalCode,
    appliedClassId,
    academicSessionId,
    previousSchool,
    previousClass,
    reason,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.admission.update({
      where: { id: admissionId },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender as any,
        bloodGroup: bloodGroup || null,
        religion: religion || null,
        nationality: nationality || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        appliedClassId,
        academicSessionId,
        previousSchool: previousSchool || null,
        previousClass: previousClass || null,
        reason: reason || null,
      },
    })

    revalidatePath("/dashboard/admissions")
    revalidatePath(`/dashboard/admissions/${admissionId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update admission. Please try again.", success: false }
  }
}

export async function deleteAdmission(admissionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "ADMISSION_OFFICER")

  const existing = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.admission.delete({ where: { id: admissionId } })

    await logAuditEvent({
      userId: profile.id,
      action: "DELETE",
      entityType: "Admission",
      entityId: admissionId,
    })

    revalidatePath("/dashboard/admissions")
  } catch (e) {
    // Silently fail
  }
}

export async function reviewAdmission(
  admissionId: string,
  action: "APPROVED" | "REJECTED" | "WAITLISTED",
  rejectionReason?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const existing = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true, status: true },
  })
  if (!existing) return { error: "Admission not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  if (existing.status !== "PENDING" && existing.status !== "UNDER_REVIEW") {
    return { error: "This admission has already been reviewed.", success: false }
  }

  try {
    const updateData: any = {
      status: action,
      reviewedById: profile.id,
      reviewedAt: new Date(),
    }

    if (action === "APPROVED") {
      updateData.approvedAt = new Date()
    } else if (action === "REJECTED") {
      updateData.rejectionReason = rejectionReason || null
    }

    await prisma.admission.update({
      where: { id: admissionId },
      data: updateData,
    })

    await logAuditEvent({
      userId: profile.id,
      action: "UPDATE",
      entityType: "Admission",
      entityId: admissionId,
      newValues: { status: action, reviewedBy: profile.id },
    })

    revalidatePath("/dashboard/admissions")
    revalidatePath(`/dashboard/admissions/${admissionId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to review admission. Please try again.", success: false }
  }
}

export async function approveAndEnroll(admissionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true, branchId: true, status: true },
  })
  if (!admission) return { error: "Admission not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && admission.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }
  if (admission.status !== "APPROVED") {
    return { error: "Only approved admissions can be enrolled.", success: false }
  }

  try {
    const fullAdmission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { guardians: true },
    })
    if (!fullAdmission) return { error: "Admission not found.", success: false }

    const student = await prisma.student.create({
      data: {
        schoolId: fullAdmission.schoolId,
        branchId: fullAdmission.branchId,
        firstName: fullAdmission.firstName,
        lastName: fullAdmission.lastName,
        dateOfBirth: fullAdmission.dateOfBirth,
        gender: fullAdmission.gender,
        bloodGroup: fullAdmission.bloodGroup,
        religion: fullAdmission.religion,
        nationality: fullAdmission.nationality,
        phone: fullAdmission.phone,
        email: fullAdmission.email,
        address: fullAdmission.address,
        city: fullAdmission.city,
        state: fullAdmission.state,
        postalCode: fullAdmission.postalCode,
        photoUrl: fullAdmission.photoUrl,
        admissionNo: fullAdmission.admissionNo,
        admissionDate: new Date(),
        status: "ACTIVE",
      },
    })

    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        classId: fullAdmission.appliedClassId,
        academicSessionId: fullAdmission.academicSessionId,
        enrollmentDate: new Date(),
        status: "ACTIVE",
      },
    })

    if (fullAdmission.guardians && fullAdmission.guardians.length > 0) {
      const parentData = fullAdmission.guardians.map((guardian) => ({
        schoolId: fullAdmission.schoolId!,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        relationship: guardian.relationship,
        phone: guardian.phone,
        email: guardian.email,
        occupation: guardian.occupation,
        address: guardian.address,
        isPrimary: guardian.isPrimary,
      }))

      const createdParents = await prisma.parent.createMany({ data: parentData })

      const parentRecords = await prisma.parent.findMany({
        where: {
          schoolId: fullAdmission.schoolId!,
          firstName: { in: fullAdmission.guardians.map((g) => g.firstName) },
          lastName: { in: fullAdmission.guardians.map((g) => g.lastName) },
        },
        select: { id: true, firstName: true, lastName: true },
      })

      const studentParentData = parentRecords.map((p) => ({
        studentId: student.id,
        parentId: p.id,
      }))

      if (studentParentData.length > 0) {
        await prisma.studentParent.createMany({ data: studentParentData })
      }
    }

    await prisma.admission.update({
      where: { id: admissionId },
      data: {
        studentId: student.id,
        reviewedById: profile.id,
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    })

    await logAuditEvent({
      userId: profile.id,
      action: "UPDATE",
      entityType: "Admission",
      entityId: admissionId,
      newValues: { status: "ENROLLED", studentId: student.id },
    })

    revalidatePath("/dashboard/admissions")
    revalidatePath(`/dashboard/admissions/${admissionId}`)
    revalidatePath("/dashboard/students")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to enroll student. Please try again.", success: false }
  }
}

export async function getAdmissions(filters?: {
  status?: string
  classId?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
    "TEACHER",
  )

  const schoolId = profile.schoolId
  if (!schoolId) return { admissions: [], total: 0 }

  const where: any = { schoolId }

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status
  }
  if (filters?.classId) {
    where.appliedClassId = filters.classId
  }
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { admissionNo: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  const page = filters?.page || 1
  const pageSize = filters?.pageSize || 20
  const skip = (page - 1) * pageSize

  const [admissions, total] = await Promise.all([
    prisma.admission.findMany({
      where,
      include: {
        appliedClass: true,
        academicSession: true,
        _count: { select: { documents: true, guardians: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.admission.count({ where }),
  ])

  return { admissions, total }
}

export async function getAdmissionById(admissionId: string) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
    "TEACHER",
  )

  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: {
      appliedClass: true,
      academicSession: true,
      branch: true,
      documents: true,
      guardians: true,
      student: true,
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!admission) return null
  if (profile.role !== "SUPER_ADMIN" && admission.schoolId !== profile.schoolId) {
    return null
  }

  return admission
}

export async function addGuardian(
  admissionId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const existing = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Admission not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const relationship = formData.get("relationship") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const occupation = formData.get("occupation") as string
  const address = formData.get("address") as string
  const isPrimary = formData.get("isPrimary") === "true"

  const parsed = guardianSchema.safeParse({
    firstName,
    lastName,
    relationship,
    phone,
    email,
    occupation,
    address,
    isPrimary,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.admissionGuardian.create({
      data: {
        admissionId,
        firstName,
        lastName,
        relationship: relationship as any,
        phone: phone || null,
        email: email || null,
        occupation: occupation || null,
        address: address || null,
        isPrimary,
      },
    })

    revalidatePath(`/dashboard/admissions/${admissionId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to add guardian. Please try again.", success: false }
  }
}

export async function deleteGuardian(guardianId: string, admissionId: string) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const existing = await prisma.admissionGuardian.findUnique({
    where: { id: guardianId },
    select: { admission: { select: { schoolId: true } } },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.admission.schoolId !== profile.schoolId) return

  try {
    await prisma.admissionGuardian.delete({ where: { id: guardianId } })
    revalidatePath(`/dashboard/admissions/${admissionId}`)
  } catch (e) {
    // Silently fail
  }
}

export async function uploadAdmissionDocument(
  admissionId: string,
  documentType: string,
  documentName: string,
  filePath: string,
  fileSize?: number,
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const existing = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Admission not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  try {
    await prisma.admissionDocument.create({
      data: {
        admissionId,
        documentType,
        documentName,
        filePath,
        fileSize: fileSize || null,
      },
    })

    revalidatePath(`/dashboard/admissions/${admissionId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to upload document. Please try again.", success: false }
  }
}

export async function deleteAdmissionDocument(documentId: string, admissionId: string) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const existing = await prisma.admissionDocument.findUnique({
    where: { id: documentId },
    select: { admission: { select: { schoolId: true } } },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.admission.schoolId !== profile.schoolId) return

  try {
    await prisma.admissionDocument.delete({ where: { id: documentId } })
    revalidatePath(`/dashboard/admissions/${admissionId}`)
  } catch (e) {
    // Silently fail
  }
}

export async function getAdmissionStats() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const schoolId = profile.schoolId
  if (!schoolId) return null

  const [total, pending, underReview, approved, rejected, waitlisted, thisMonth] =
    await Promise.all([
      prisma.admission.count({ where: { schoolId } }),
      prisma.admission.count({ where: { schoolId, status: "PENDING" } }),
      prisma.admission.count({ where: { schoolId, status: "UNDER_REVIEW" } }),
      prisma.admission.count({ where: { schoolId, status: "APPROVED" } }),
      prisma.admission.count({ where: { schoolId, status: "REJECTED" } }),
      prisma.admission.count({ where: { schoolId, status: "WAITLISTED" } }),
      prisma.admission.count({
        where: {
          schoolId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ])

  return { total, pending, underReview, approved, rejected, waitlisted, thisMonth }
}

export async function getAdmissionsByClass() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const schoolId = profile.schoolId
  if (!schoolId) return []

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: {
      _count: { select: { admissions: true } },
    },
    orderBy: { name: "asc" },
  })

  return classes.map((c) => ({
    className: c.name,
    count: c._count.admissions,
  }))
}

export async function getAdmissionsByMonth() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
  )

  const schoolId = profile.schoolId
  if (!schoolId) return []

  const months = []
  const now = new Date()

  const monthRanges: { label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startDate = date
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    monthRanges.push({
      label: date.toLocaleString("default", { month: "short", year: "numeric" }),
      start: startDate,
      end: endDate,
    })
  }

  const allAdmissions = await prisma.admission.findMany({
    where: {
      schoolId,
      createdAt: {
        gte: monthRanges[0].start,
        lte: monthRanges[monthRanges.length - 1].end,
      },
    },
    select: { createdAt: true },
  })

  for (const range of monthRanges) {
    const count = allAdmissions.filter((a) => {
      const d = a.createdAt
      return d >= range.start && d <= range.end
    }).length
    months.push({ month: range.label, count })
  }

  return months
}
