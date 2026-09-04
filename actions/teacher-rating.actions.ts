"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { z } from "zod"

const ratingSchema = z.object({
  teacherId: z.string().uuid("Invalid teacher"),
  rating: z.string().min(1).max(5),
  feedback: z.string().optional(),
})

export async function submitTeacherRating(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("STUDENT", "PARENT")

  const parsed = ratingSchema.safeParse({
    teacherId: formData.get("teacherId"),
    rating: formData.get("rating"),
    feedback: formData.get("feedback"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: parsed.data.teacherId },
    select: { schoolId: true },
  })
  if (!teacher) return { error: "Teacher not found.", success: false }
  if (teacher.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.teacherRating.create({
    data: {
      teacher: { connect: { id: parsed.data.teacherId } },
      rater: { connect: { id: profile.id } },
      raterRole: profile.role as any,
      rating: parseInt(parsed.data.rating),
      feedback: parsed.data.feedback,
      schoolId: profile.schoolId!,
      branchId: profile.branchId!,
    },
  })

  revalidatePath("/portal/student")
  revalidatePath("/portal/parent")
  return { success: true, error: undefined }
}

export async function getTeacherRatings(teacherId: string) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
  )

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  })
  if (!teacher) return { ratings: [], average: 0, count: 0 }
  if (profile.role !== "SUPER_ADMIN" && teacher.schoolId !== profile.schoolId) {
    return { ratings: [], average: 0, count: 0 }
  }

  const ratings = await prisma.teacherRating.findMany({
    where: { teacherId },
    include: {
      rater: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const avgResult = await prisma.teacherRating.aggregate({
    where: { teacherId },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return {
    ratings,
    average: avgResult._avg.rating || 0,
    count: avgResult._count.rating,
  }
}

export async function getTeacherRatingSummary() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const teachers = await prisma.teacher.findMany({
    where: { schoolId: profile.schoolId || undefined, status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      _count: { select: { ratings: true } },
    },
  })

  const summaries = await Promise.all(
    teachers.map(async (t) => {
      const agg = await prisma.teacherRating.aggregate({
        where: { teacherId: t.id },
        _avg: { rating: true },
        _count: { rating: true },
      })
      return {
        ...t,
        averageRating: agg._avg.rating || 0,
        totalRatings: agg._count.rating,
      }
    }),
  )

  return summaries.sort((a, b) => b.averageRating - a.averageRating)
}
