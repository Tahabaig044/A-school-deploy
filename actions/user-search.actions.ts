"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"

export async function searchUsers(
  query: string,
  filters: {
    roles?: string[]
    classId?: string
    department?: string
  } = {},
) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
  )

  if (!query || query.length < 2) return []

  const schoolId = profile.schoolId!

  const [profiles, students, teachers, staff] = await Promise.all([
    prisma.profile.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(filters.roles?.length ? { role: { in: filters.roles as any } } : {}),
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        staff: { select: { employeeCode: true, department: true } },
        teacher: { select: { employeeCode: true } },
      },
      take: 20,
    }),

    prisma.student.findMany({
      where: {
        schoolId,
        status: "ACTIVE",
        ...(filters.classId
          ? { enrollments: { some: { classId: filters.classId, status: "ACTIVE" } } }
          : {}),
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { admissionNo: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNo: true,
        enrollments: {
          where: { status: "ACTIVE" },
          select: {
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
          take: 1,
        },
      },
      take: 20,
    }),

    filters.roles?.includes("TEACHER") || !filters.roles?.length
      ? prisma.teacher.findMany({
          where: {
            schoolId,
            status: "ACTIVE",
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { employeeCode: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            profileId: true,
          },
          take: 20,
        })
      : [],

    filters.roles?.includes("STAFF") || !filters.roles?.length
      ? prisma.staff.findMany({
          where: {
            schoolId,
            status: "ACTIVE",
            ...(filters.department ? { department: filters.department } : {}),
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { employeeCode: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            profileId: true,
          },
          take: 20,
        })
      : [],
  ])

  const results: Array<{
    id: string
    profileId: string | null
    name: string
    email?: string | null
    role: string
    identifier?: string | null
    department?: string | null
    class?: string | null
    section?: string | null
  }> = []

  for (const p of profiles) {
    const employeeCode = p.staff?.employeeCode || p.teacher?.employeeCode
    results.push({
      id: p.id,
      profileId: p.id,
      name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
      email: p.email,
      role: p.role,
      identifier: employeeCode || null,
      department: p.staff?.department || null,
    })
  }

  for (const s of students) {
    results.push({
      id: s.id,
      profileId: null,
      name: `${s.firstName} ${s.lastName}`.trim(),
      role: "STUDENT",
      identifier: s.admissionNo || null,
      class: s.enrollments[0]?.class?.name || null,
      section: s.enrollments[0]?.section?.name || null,
    })
  }

  for (const t of teachers) {
    if (!results.some((r) => r.profileId === t.profileId)) {
      results.push({
        id: t.id,
        profileId: t.profileId,
        name: `${t.firstName} ${t.lastName}`.trim(),
        role: "TEACHER",
        identifier: t.employeeCode || null,
      })
    }
  }

  for (const s of staff) {
    if (!results.some((r) => r.profileId === s.profileId)) {
      results.push({
        id: s.id,
        profileId: s.profileId,
        name: `${s.firstName} ${s.lastName}`.trim(),
        role: "STAFF",
        identifier: s.employeeCode || null,
        department: s.department || null,
      })
    }
  }

  return results.slice(0, 50)
}

export type SearchUserResult = Awaited<ReturnType<typeof searchUsers>>[number]
