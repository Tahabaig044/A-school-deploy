"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const alumniSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  graduationYear: z.string().min(1, "Graduation year is required"),
  class: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export async function createAlumni(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Alumni")
  const branchId = getBranchId(profile, formData, "Create Alumni")

  const parsed = alumniSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    graduationYear: formData.get("graduationYear"),
    class: formData.get("class"),
    profession: formData.get("profession"),
    company: formData.get("company"),
    address: formData.get("address"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.alumni.create({
      data: {
        school: { connect: { id: schoolId } },
        branch: { connect: { id: branchId } },
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        graduationYear: parseInt(parsed.data.graduationYear),
        class: parsed.data.class,
        profession: parsed.data.profession,
        company: parsed.data.company,
        address: parsed.data.address,
      },
    })

    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Alumni",
      newValues: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    })

    revalidatePath("/dashboard/alumni")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to create alumni record.", success: false }
  }
}

export async function getAlumniList(filters?: { graduationYear?: string; search?: string }) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const where: any = {
    isActive: true,
    schoolId: profile.schoolId || undefined,
  }

  if (filters?.graduationYear) {
    where.graduationYear = parseInt(filters.graduationYear)
  }

  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  return prisma.alumni.findMany({
    where,
    orderBy: { graduationYear: "desc" },
  })
}

export async function deleteAlumni(alumniId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const alumni = await prisma.alumni.findUnique({
    where: { id: alumniId },
    select: { schoolId: true },
  })
  if (!alumni) return { error: "Alumni not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && alumni.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.alumni.update({
    where: { id: alumniId },
    data: { isActive: false },
  })

  revalidatePath("/dashboard/alumni")
  return { success: true }
}

// ─── Alumni Events ──────────────────────────────────────────────

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventDate: z.string().min(1, "Event date is required"),
  location: z.string().optional(),
  maxAttendees: z.string().optional(),
})

export async function createAlumniEvent(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Alumni Event")
  const branchId = getBranchId(profile, formData, "Create Alumni Event")

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    maxAttendees: formData.get("maxAttendees"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.alumniEvent.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: new Date(parsed.data.eventDate),
      location: parsed.data.location,
      maxAttendees: parsed.data.maxAttendees ? parseInt(parsed.data.maxAttendees) : null,
    },
  })

  revalidatePath("/dashboard/alumni/events")
  return { success: true, error: undefined }
}

export async function getAlumniEvents() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  return prisma.alumniEvent.findMany({
    where: {
      isActive: true,
      schoolId: profile.schoolId || undefined,
    },
    include: {
      _count: { select: { registrations: true } },
    },
    orderBy: { eventDate: "desc" },
  })
}

export async function registerForEvent(eventId: string, alumniId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const event = await prisma.alumniEvent.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } },
  })

  if (!event) return { error: "Event not found" }
  if (profile.role !== "SUPER_ADMIN" && event.schoolId !== profile.schoolId) {
    return { error: "Forbidden" }
  }
  if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
    return { error: "Event is full" }
  }

  const alumni = await prisma.alumni.findUnique({
    where: { id: alumniId },
    select: { schoolId: true },
  })
  if (!alumni) return { error: "Alumni not found" }
  if (profile.role !== "SUPER_ADMIN" && alumni.schoolId !== profile.schoolId) {
    return { error: "Forbidden" }
  }

  await prisma.alumniEventRegistration.create({
    data: {
      event: { connect: { id: eventId } },
      alumni: { connect: { id: alumniId } },
    },
  })

  revalidatePath("/dashboard/alumni/events")
  return { success: true }
}
