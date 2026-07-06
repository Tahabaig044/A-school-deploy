import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  return profile
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user
}

export async function requireRole(...roles: string[]) {
  const user = await requireAuth()

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  if (!profile || !roles.includes(profile.role)) {
    throw new Error("Forbidden")
  }

  return { user, profile }
}
