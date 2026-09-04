import { prisma } from "@/lib/prisma"

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PAYMENT"
  | "ONLINE_PAYMENT"
  | "ENROLLMENT"
  | "ATTENDANCE"
  | "CANCEL"

interface AuditLogParams {
  userId: string
  schoolId?: string
  branchId?: string
  action: AuditAction
  entityType: string
  entityId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        schoolId: params.schoolId,
        branchId: params.branchId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues || undefined,
        newValues: params.newValues || undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (error) {
    console.error("Failed to log audit event:", error)
  }
}

export async function getAuditLogs(filters: {
  schoolId?: string
  branchId?: string
  userId?: string
  entityType?: string
  entityId?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}) {
  const where: any = {}
  if (filters.schoolId) where.schoolId = filters.schoolId
  if (filters.branchId) where.branchId = filters.branchId
  if (filters.userId) where.userId = filters.userId
  if (filters.entityType) where.entityType = filters.entityType
  if (filters.entityId) where.entityId = filters.entityId
  if (filters.fromDate || filters.toDate) {
    where.createdAt = {}
    if (filters.fromDate) where.createdAt.gte = filters.fromDate
    if (filters.toDate) where.createdAt.lte = filters.toDate
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit || 50,
    skip: filters.offset || 0,
  })
}

export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })
}
