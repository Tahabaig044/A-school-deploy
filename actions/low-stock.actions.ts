"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function checkLowStockItems(threshold: number = 5) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "LIBRARIAN",
  )

  const lowStockBooks = await prisma.libraryBook.findMany({
    where: {
      isActive: true,
      schoolId: profile.schoolId || undefined,
      available: { lte: threshold },
    },
    select: {
      id: true,
      title: true,
      author: true,
      quantity: true,
      available: true,
      category: true,
    },
    orderBy: { available: "asc" },
  })

  return lowStockBooks
}

export async function getLowStockCount(threshold: number = 5) {
  const { profile } = await requireRole(
    "SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "LIBRARIAN",
  )

  const count = await prisma.libraryBook.count({
    where: {
      isActive: true,
      schoolId: profile.schoolId || undefined,
      available: { lte: threshold },
    },
  })

  return count
}
