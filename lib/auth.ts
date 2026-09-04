import { cache } from "react"
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
    isActive: boolean
    status: string
  }
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async (): Promise<AuthContext["profile"] | null> => {
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
      isActive: true,
      status: true,
    },
  })

  return profile
})

export async function requireAuth(): Promise<AuthContext["user"]> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireRole(...roles: string[]): Promise<AuthContext> {
  const user = await requireAuth()

  const profile = await getCurrentProfile()

  if (!profile || !roles.includes(profile.role)) {
    throw new Error("Forbidden")
  }

  if (!profile.isActive || profile.status !== "ACTIVE") {
    throw new Error("Account is not active")
  }

  return { user, profile }
}
