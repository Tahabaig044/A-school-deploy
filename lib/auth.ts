import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/constants"

interface AuthContext {
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
  profile: {
    id: string
    role: Role
    schoolId: string | null
    branchId: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
  }
}

let currentRequestContext: AuthContext | null = null

export function setRequestContext(ctx: AuthContext) {
  currentRequestContext = ctx
}

export function getRequestContext(): AuthContext | null {
  return currentRequestContext
}

export function clearRequestContext() {
  currentRequestContext = null
}

export async function getCurrentUser() {
  const cached = getRequestContext()
  if (cached) return cached.user

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const cached = getRequestContext()
  if (cached) return cached.profile

  const user = await getCurrentUser()
  if (!user) return null

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      schoolId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })

  return profile
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireRole(...roles: string[]) {
  const cached = getRequestContext()
  if (cached) {
    if (!roles.includes(cached.profile.role)) throw new Error("Forbidden")
    return cached
  }

  const user = await requireAuth()

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      schoolId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })

  if (!profile || !roles.includes(profile.role)) {
    throw new Error("Forbidden")
  }

  return { user, profile }
}
