"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId, getOptionalBranchId } from "@/lib/school-context"
import { z } from "zod"

const vehicleSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  plateNumber: z.string().min(1, "Plate number is required"),
  vehicleType: z.string().min(1, "Vehicle type is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
})

const transportRouteSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  name: z.string().min(1, "Route name is required"),
  startLocation: z.string().min(1, "Start location is required"),
  endLocation: z.string().min(1, "End location is required"),
  stops: z.string().optional(),
  pickupTime: z.string().optional(),
  dropTime: z.string().optional(),
  monthlyFee: z.number().min(0).optional(),
})

const studentTransportSchema = z.object({
  studentId: z.string().uuid(),
  routeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
})

export async function createVehicle(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Add Vehicle")
  const branchId = getBranchId(profile, formData, "Add Vehicle")
  const plateNumber = formData.get("plateNumber") as string
  const vehicleType = formData.get("vehicleType") as string
  const capacity = Number(formData.get("capacity") as string)
  const driverName = formData.get("driverName") as string || undefined
  const driverPhone = formData.get("driverPhone") as string || undefined

  const parsed = vehicleSchema.safeParse({
    schoolId, branchId, plateNumber, vehicleType, capacity, driverName, driverPhone,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.vehicle.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      plateNumber, vehicleType, capacity, driverName, driverPhone,
    },
  })

  revalidatePath("/dashboard/transport/vehicles")
  return { success: true, error: undefined }
}

export async function updateVehicle(
  vehicleId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const plateNumber = formData.get("plateNumber") as string
  const vehicleType = formData.get("vehicleType") as string
  const capacity = Number(formData.get("capacity") as string)
  const driverName = formData.get("driverName") as string || undefined
  const driverPhone = formData.get("driverPhone") as string || undefined
  const isActive = formData.get("isActive") === "true"

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { plateNumber, vehicleType, capacity, driverName, driverPhone, isActive },
  })

  revalidatePath("/dashboard/transport/vehicles")
  return { success: true, error: undefined }
}

export async function deleteVehicle(vehicleId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.vehicle.delete({ where: { id: vehicleId } })
  revalidatePath("/dashboard/transport/vehicles")
  return { success: true }
}

export async function getVehicles(schoolId: string, branchId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  return prisma.vehicle.findMany({
    where: { schoolId, branchId },
    include: {
      _count: { select: { routes: true, assignments: true } },
    },
    orderBy: { plateNumber: "asc" },
  })
}

export async function getVehicleById(vehicleId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  return prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      routes: true,
      assignments: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
          route: true,
        },
      },
    },
  })
}

export async function createTransportRoute(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Transport Route")
  const branchId = getBranchId(profile, formData, "Create Transport Route")
  const vehicleId = formData.get("vehicleId") as string
  const name = formData.get("name") as string
  const startLocation = formData.get("startLocation") as string
  const endLocation = formData.get("endLocation") as string
  const stops = formData.get("stops") as string || undefined
  const pickupTime = formData.get("pickupTime") as string || undefined
  const dropTime = formData.get("dropTime") as string || undefined
  const monthlyFeeStr = formData.get("monthlyFee") as string
  const monthlyFee = monthlyFeeStr ? Number(monthlyFeeStr) : undefined

  const parsed = transportRouteSchema.safeParse({
    schoolId, branchId, vehicleId, name, startLocation, endLocation,
    stops, pickupTime, dropTime, monthlyFee,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.transportRoute.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      vehicle: { connect: { id: vehicleId } },
      name, startLocation, endLocation,
      stops, pickupTime, dropTime, monthlyFee,
    },
  })

  revalidatePath("/dashboard/transport/routes")
  return { success: true, error: undefined }
}

export async function updateTransportRoute(
  routeId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const name = formData.get("name") as string
  const startLocation = formData.get("startLocation") as string
  const endLocation = formData.get("endLocation") as string
  const stops = formData.get("stops") as string || undefined
  const pickupTime = formData.get("pickupTime") as string || undefined
  const dropTime = formData.get("dropTime") as string || undefined
  const monthlyFeeStr = formData.get("monthlyFee") as string
  const monthlyFee = monthlyFeeStr ? Number(monthlyFeeStr) : undefined
  const isActive = formData.get("isActive") === "true"

  await prisma.transportRoute.update({
    where: { id: routeId },
    data: { name, startLocation, endLocation, stops, pickupTime, dropTime, monthlyFee, isActive },
  })

  revalidatePath("/dashboard/transport/routes")
  return { success: true, error: undefined }
}

export async function deleteTransportRoute(routeId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.transportRoute.delete({ where: { id: routeId } })
  revalidatePath("/dashboard/transport/routes")
  return { success: true }
}

export async function getTransportRoutes(schoolId: string, branchId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  return prisma.transportRoute.findMany({
    where: { schoolId, branchId },
    include: {
      vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { name: "asc" },
  })
}

export async function assignStudentTransport(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const studentId = formData.get("studentId") as string
  const routeId = formData.get("routeId") as string
  const vehicleId = formData.get("vehicleId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string || undefined

  const parsed = studentTransportSchema.safeParse({
    studentId, routeId, vehicleId, academicSessionId, startDate, endDate,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const existing = await prisma.studentTransport.findUnique({
    where: { studentId_academicSessionId: { studentId, academicSessionId } },
  })

  if (existing) {
    return { error: "Student already has transport assigned for this session.", success: false }
  }

  await prisma.studentTransport.create({
    data: {
      studentId, routeId, vehicleId, academicSessionId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    },
  })

  revalidatePath("/dashboard/transport/assignments")
  return { success: true, error: undefined }
}

export async function removeStudentTransport(assignmentId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.studentTransport.delete({ where: { id: assignmentId } })
  revalidatePath("/dashboard/transport/assignments")
  return { success: true }
}

export async function getStudentTransportAssignments(
  schoolId: string,
  branchId: string,
  academicSessionId: string
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  return prisma.studentTransport.findMany({
    where: {
      route: { schoolId, branchId },
      academicSessionId,
      isActive: true,
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      route: true,
      vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
    },
    orderBy: { student: { firstName: "asc" } },
  })
}

export async function getTransportStats(schoolId: string, branchId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const [totalVehicles, activeVehicles, totalRoutes, totalStudents] = await Promise.all([
    prisma.vehicle.count({ where: { schoolId, branchId } }),
    prisma.vehicle.count({ where: { schoolId, branchId, isActive: true } }),
    prisma.transportRoute.count({ where: { schoolId, branchId, isActive: true } }),
    prisma.studentTransport.count({
      where: { route: { schoolId, branchId }, isActive: true },
    }),
  ])

  return { totalVehicles, activeVehicles, totalRoutes, totalStudents }
}
