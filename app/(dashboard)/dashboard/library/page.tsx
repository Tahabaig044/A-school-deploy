import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { BookList } from "./book-list"

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "STUDENT",
  )
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const [books, total] = await Promise.all([
    prisma.libraryBook.findMany({
      where,
      orderBy: { title: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.libraryBook.count({ where }),
  ])

  return (
    <BookList
      books={JSON.parse(JSON.stringify(books))}
      total={total}
      page={page}
      pageSize={pageSize}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
