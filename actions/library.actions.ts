"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { z } from "zod"

const libraryBookSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  author: z.string().optional(),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  location: z.string().optional(),
})

const bookIssueSchema = z.object({
  bookId: z.string().uuid(),
  studentId: z.string().uuid(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
})

export async function createBook(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Add Library Book")
  const branchId = getBranchId(profile, formData, "Add Library Book")
  const title = formData.get("title") as string
  const author = (formData.get("author") as string) || undefined
  const isbn = (formData.get("isbn") as string) || undefined
  const publisher = (formData.get("publisher") as string) || undefined
  const category = (formData.get("category") as string) || undefined
  const quantity = Number(formData.get("quantity") as string) || 1
  const location = (formData.get("location") as string) || undefined

  const parsed = libraryBookSchema.safeParse({
    schoolId,
    branchId,
    title,
    author,
    isbn,
    publisher,
    category,
    quantity,
    location,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.libraryBook.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      title,
      author,
      isbn,
      publisher,
      category,
      quantity,
      available: quantity,
      location,
    },
  })

  revalidatePath("/dashboard/library")
  return { success: true, error: undefined }
}

export async function updateBook(
  bookId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const title = formData.get("title") as string
  const author = (formData.get("author") as string) || undefined
  const isbn = (formData.get("isbn") as string) || undefined
  const publisher = (formData.get("publisher") as string) || undefined
  const category = (formData.get("category") as string) || undefined
  const quantity = Number(formData.get("quantity") as string) || 1
  const location = (formData.get("location") as string) || undefined
  const isActive = formData.get("isActive") === "true"

  const book = await prisma.libraryBook.findUnique({ where: { id: bookId } })
  if (!book) return { error: "Book not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && book.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  const quantityDiff = quantity - book.quantity
  const newAvailable = Math.max(0, book.available + quantityDiff)

  await prisma.libraryBook.update({
    where: { id: bookId },
    data: {
      title,
      author,
      isbn,
      publisher,
      category,
      quantity,
      location,
      isActive,
      available: newAvailable,
    },
  })

  revalidatePath("/dashboard/library")
  return { success: true, error: undefined }
}

export async function deleteBook(bookId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const book = await prisma.libraryBook.findUnique({ where: { id: bookId }, select: { schoolId: true } })
  if (!book) return { error: "Book not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && book.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.libraryBook.delete({ where: { id: bookId } })
  revalidatePath("/dashboard/library")
  return { success: true }
}

export async function getBooks(
  schoolId: string,
  branchId: string,
  filters?: { category?: string; search?: string },
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  return prisma.libraryBook.findMany({
    where: {
      schoolId: effectiveSchoolId,
      ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
      isActive: true,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { author: { contains: filters.search, mode: "insensitive" } },
          { isbn: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { title: "asc" },
  })
}

export async function getBookById(bookId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")

  const book = await prisma.libraryBook.findUnique({
    where: { id: bookId },
    include: {
      issues: {
        where: { status: "ISSUED" },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
        },
      },
    },
  })
  if (!book) return null
  if (profile.role !== "SUPER_ADMIN" && book.schoolId !== profile.schoolId) return null

  return book
}

export async function issueBook(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const bookId = formData.get("bookId") as string
  const studentId = formData.get("studentId") as string
  const issueDate = formData.get("issueDate") as string
  const dueDate = formData.get("dueDate") as string
  const notes = (formData.get("notes") as string) || undefined

  const parsed = bookIssueSchema.safeParse({ bookId, studentId, issueDate, dueDate, notes })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const book = await prisma.libraryBook.findUnique({ where: { id: bookId } })
  if (!book) return { error: "Book not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && book.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }
  if (book.available <= 0) return { error: "No copies available for issue.", success: false }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true },
  })
  if (!student) return { error: "Student not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && student.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookIssue.create({
      data: {
        bookId,
        studentId,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        notes,
        status: "ISSUED",
      },
    })

    await tx.libraryBook.update({
      where: { id: bookId },
      data: { available: book.available - 1 },
    })
  })

  revalidatePath("/dashboard/library/issues")
  return { success: true, error: undefined }
}

export async function returnBook(issueId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const issue = await prisma.bookIssue.findUnique({
    where: { id: issueId },
    include: { book: { select: { id: true, schoolId: true, available: true } } },
  })
  if (!issue) return { error: "Issue record not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && issue.book.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }
  if (issue.status === "RETURNED") return { error: "Book already returned.", success: false }

  const today = new Date()
  const dueDate = new Date(issue.dueDate)
  let fineAmount = 0

  if (today > dueDate) {
    const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    fineAmount = daysOverdue * 1
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookIssue.update({
      where: { id: issueId },
      data: {
        returnDate: today,
        status: "RETURNED",
        fineAmount,
      },
    })

    await tx.libraryBook.update({
      where: { id: issue.bookId },
      data: { available: issue.book.available + 1 },
    })
  })

  revalidatePath("/dashboard/library/issues")
  return { success: true, error: undefined, fineAmount }
}

export async function getBookIssues(
  schoolId: string,
  branchId: string,
  filters?: { status?: string; studentId?: string },
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  return prisma.bookIssue.findMany({
    where: {
      book: {
        schoolId: effectiveSchoolId,
        ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
      },
      ...(filters?.status && { status: filters.status }),
      ...(filters?.studentId && { studentId: filters.studentId }),
    },
    include: {
      book: { select: { id: true, title: true, author: true } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
    },
    orderBy: { issueDate: "desc" },
  })
}

export async function getOverdueBooks(schoolId: string, branchId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  return prisma.bookIssue.findMany({
    where: {
      book: {
        schoolId: effectiveSchoolId,
        ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
      },
      status: "ISSUED",
      dueDate: { lt: new Date() },
    },
    include: {
      book: { select: { id: true, title: true, author: true } },
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true },
      },
    },
    orderBy: { dueDate: "asc" },
  })
}

export async function getLibraryStats(schoolId: string, branchId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const [totalBooks, issuedBooks, overdueBooks, totalFines] = await Promise.all([
    prisma.libraryBook.count({
      where: {
        schoolId: effectiveSchoolId,
        ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
        isActive: true,
      },
    }),
    prisma.bookIssue.count({
      where: {
        book: {
          schoolId: effectiveSchoolId,
          ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
        },
        status: "ISSUED",
      },
    }),
    prisma.bookIssue.count({
      where: {
        book: {
          schoolId: effectiveSchoolId,
          ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
        },
        status: "ISSUED",
        dueDate: { lt: new Date() },
      },
    }),
    prisma.bookIssue.aggregate({
      where: {
        book: {
          schoolId: effectiveSchoolId,
          ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
        },
        fineAmount: { gt: 0 },
      },
      _sum: { fineAmount: true },
    }),
  ])

  return {
    totalBooks,
    issuedBooks,
    overdueBooks,
    totalFines: Number(totalFines._sum.fineAmount || 0),
  }
}
