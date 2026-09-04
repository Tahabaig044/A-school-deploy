"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/constants"
import { getRedirectPath } from "@/lib/auth-helpers"
import { generateToken, hashToken } from "@/lib/token"
import { logAuditEvent } from "@/lib/audit"

type ActionResult = {
  error?: string
  success?: boolean
  invitationLink?: string
}

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 30
const INVITATION_EXPIRY_HOURS = 24
const MIN_PASSWORD_LENGTH = 8

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter."
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter."
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number."
  }
  return null
}

const SELF_REGISTER_ROLES: Role[] = ["STUDENT", "PARENT", "TEACHER"]

// Roles that School Admin CANNOT invite
const RESTRICTED_ROLES_FOR_SCHOOL_ADMIN: Role[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"]

// System-level roles only - academic roles (Teacher, Student, Parent) must be created from their modules
const USERS_MODULE_ALLOWED_ROLES: Role[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "BRANCH_ADMIN",
  "PRINCIPAL",
  "ACCOUNTANT",
  "ADMISSION_OFFICER",
  "LIBRARIAN",
  "TRANSPORT_MANAGER",
]

// ─── Invite User ───────────────────────────────────────────────
export async function inviteUser(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { profile, user } = await requireInvitePermission()

  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const firstName = (formData.get("firstName") as string)?.trim()
  const lastName = (formData.get("lastName") as string)?.trim()
  const role = formData.get("role") as Role
  const phone = (formData.get("phone") as string)?.trim() || null

  if (!email || !firstName || !lastName || !role) {
    return { error: "All required fields must be filled." }
  }

  // Academic roles must be created from their respective modules
  if (["TEACHER", "STUDENT", "PARENT"].includes(role)) {
    return {
      error: "Teachers, Students, and Parents must be created from their respective modules.",
    }
  }

  // Validate role is allowed for Users module
  if (!USERS_MODULE_ALLOWED_ROLES.includes(role)) {
    return { error: "Invalid role for user creation." }
  }

  // School Admin can't invite School Admin or Super Admin
  if (profile.role === "SCHOOL_ADMIN" && RESTRICTED_ROLES_FOR_SCHOOL_ADMIN.includes(role)) {
    return { error: "You cannot invite users with this role." }
  }

  // Requirement 3: Email uniqueness check across Auth and Profile
  const existingProfile = await prisma.profile.findUnique({
    where: { email },
    select: { id: true, status: true },
  })

  if (existingProfile) {
    if (existingProfile.status === "INVITED") {
      return { error: "A pending invitation already exists for this email." }
    }
    return { error: "A user with this email already exists." }
  }

  // Check Supabase auth
  const serviceClient = await createServiceClient()
  const { data: authUsers } = await serviceClient.auth.admin.listUsers()
  if (authUsers.users.some((u) => u.email === email)) {
    return { error: "A user with this email already exists in authentication." }
  }

  // Requirement 1: Generate token and hash it
  const rawToken = generateToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

  // Requirement 2: Create Supabase auth user WITHOUT password
  // Use inviteUser which sends an email, or create with email_confirm
  const { data: authData, error: authError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`,
    },
  )

  if (authError) {
    // Fallback: create user without password if invite fails
    const { data: fallbackData, error: fallbackError } = await serviceClient.auth.admin.createUser({
      email,
      password: generateToken(), // random unusable password
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    })

    if (fallbackError) {
      return { error: "Failed to create user. Please try again." }
    }

    // Create profile with hashed token
    await prisma.profile.create({
      data: {
        id: fallbackData.user.id,
        email,
        firstName,
        lastName,
        role,
        phone,
        schoolId: profile.schoolId || undefined,
        branchId: profile.branchId || undefined,
        status: "INVITED",
        invitationToken: hashedToken,
        invitationExpiresAt: expiresAt,
        invitedById: user.id,
      },
    })

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`

    // Requirement 8: Audit log
    await logAuditEvent({
      userId: user.id,
      schoolId: profile.schoolId || undefined,
      branchId: profile.branchId || undefined,
      action: "CREATE",
      entityType: "INVITATION",
      entityId: fallbackData.user.id,
      newValues: { email, role, firstName, lastName },
    })

    revalidatePath("/dashboard/users")
    return { success: true, invitationLink }
  }

  // Create profile with hashed token
  await prisma.profile.create({
    data: {
      id: authData.user.id,
      email,
      firstName,
      lastName,
      role,
      phone,
      schoolId: profile.schoolId || undefined,
      branchId: profile.branchId || undefined,
      status: "INVITED",
      invitationToken: hashedToken,
      invitationExpiresAt: expiresAt,
      invitedById: user.id,
    },
  })

  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup-password?token=${rawToken}`

  // Requirement 8: Audit log
  await logAuditEvent({
    userId: user.id,
    schoolId: profile.schoolId || undefined,
    branchId: profile.branchId || undefined,
    action: "CREATE",
    entityType: "INVITATION",
    entityId: authData.user.id,
    newValues: { email, role, firstName, lastName },
  })

  revalidatePath("/dashboard/users")
  return { success: true, invitationLink }
}

// ─── Get Invitation by Token ───────────────────────────────────
export async function getInvitationByToken(token: string) {
  // Requirement 1: Hash the token before looking up
  const hashedToken = hashToken(token)

  const profile = await prisma.profile.findUnique({
    where: { invitationToken: hashedToken },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      invitationExpiresAt: true,
    },
  })

  if (!profile) {
    return { error: "Invalid invitation link." }
  }

  // Requirement 9: One-time use - check status
  if (profile.status !== "INVITED") {
    return { error: "This invitation has already been used." }
  }

  // Check expiry
  if (profile.invitationExpiresAt && new Date() > profile.invitationExpiresAt) {
    return { error: "This invitation has expired. Please request a new one." }
  }

  return { profile }
}

// ─── Accept Invitation (Set Password) ──────────────────────────
export async function acceptInvitation(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!token || !password) {
    return { error: "Token and password are required." }
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    return { error: passwordError }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  // Validate token
  const result = await getInvitationByToken(token)
  if (result.error || !result.profile) {
    return { error: result.error }
  }

  const profile = result.profile

  // Set password via Supabase admin
  const serviceClient = await createServiceClient()
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(profile.id, {
    password,
  })

  if (updateError) {
    return { error: "Failed to set password. Please try again." }
  }

  // Requirement 9: One-time use - clear token and activate
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      status: "ACTIVE",
      isActive: true,
      invitationToken: null,
      invitationExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })

  // Requirement 8: Audit log
  await logAuditEvent({
    userId: profile.id,
    action: "UPDATE",
    entityType: "USER",
    entityId: profile.id,
    newValues: { status: "ACTIVE", action: "INVITATION_ACCEPTED" },
  })

  return { success: true }
}

// ─── Sign In with Lockout ──────────────────────────────────────
export async function signin(
  _prevState: { error?: string; twoFactorRequired?: boolean; userId?: string } | null,
  formData: FormData,
): Promise<{ error?: string; twoFactorRequired?: boolean; userId?: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const ipAddress = formData.get("ipAddress") as string | null
  const device = formData.get("device") as string | null

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  // Look up profile by email to check lockout
  const profile = await prisma.profile.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      status: true,
      isActive: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      schoolId: true,
      branchId: true,
      twoFactorEnabled: true,
    },
  })

  // Requirement 6: Check lockout
  if (profile?.lockedUntil && new Date() < profile.lockedUntil) {
    const minutesLeft = Math.ceil((profile.lockedUntil.getTime() - Date.now()) / (1000 * 60))
    return {
      error: `Account is locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
    }
  }

  // Check if account is active
  if (profile && (profile.status !== "ACTIVE" || !profile.isActive)) {
    return { error: "Your account is not active. Please check your invitation." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Requirement 6: Increment failed login counter
    if (profile) {
      const newAttempts = profile.failedLoginAttempts + 1
      const updateData: any = { failedLoginAttempts: newAttempts }

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        updateData.failedLoginAttempts = 0 // Reset after lockout
      }

      await prisma.profile.update({
        where: { id: profile.id },
        data: updateData,
      })

      // Audit log for failed attempt
      await logAuditEvent({
        userId: profile.id,
        schoolId: profile.schoolId || undefined,
        branchId: profile.branchId || undefined,
        action: "LOGIN",
        entityType: "USER",
        entityId: profile.id,
        newValues: {
          success: false,
          attempts: newAttempts,
          locked: newAttempts >= MAX_FAILED_ATTEMPTS,
        },
        ipAddress: ipAddress || undefined,
        userAgent: device || undefined,
      })
    }

    return { error: "Invalid email or password." }
  }

  // Successful login - get user profile for redirect
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let redirectPath = "/dashboard"

  if (user) {
    const loginProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, schoolId: true, branchId: true, twoFactorEnabled: true },
    })

    if (loginProfile) {
      // Check if 2FA is enabled
      if (loginProfile.twoFactorEnabled) {
        // Don't redirect - return 2FA required flag
        return { twoFactorRequired: true, userId: user.id }
      }

      // Requirement 5: Update login activity
      await prisma.profile.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
          lastLoginDevice: device || null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      })

      // Audit log for successful login
      await logAuditEvent({
        userId: user.id,
        schoolId: loginProfile.schoolId || undefined,
        branchId: loginProfile.branchId || undefined,
        action: "LOGIN",
        entityType: "USER",
        entityId: user.id,
        newValues: { success: true },
        ipAddress: ipAddress || undefined,
        userAgent: device || undefined,
      })

      redirectPath = getRedirectPath(loginProfile.role)
    }
  }

  revalidatePath("/", "layout")
  redirect(redirectPath)
}

// ─── Sign Out ──────────────────────────────────────────────────
export async function signout() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { schoolId: true, branchId: true },
    })

    // Audit log
    await logAuditEvent({
      userId: user.id,
      schoolId: profile?.schoolId || undefined,
      branchId: profile?.branchId || undefined,
      action: "LOGOUT",
      entityType: "USER",
      entityId: user.id,
    })
  }

  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

// ─── Forgot Password ───────────────────────────────────────────
export async function forgotPassword(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const email = (formData.get("email") as string)?.trim().toLowerCase()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    return { error: "Failed to send password reset email. Please try again." }
  }

  // Audit log
  const profile = await prisma.profile.findUnique({
    where: { email },
    select: { id: true, schoolId: true, branchId: true },
  })

  if (profile) {
    await logAuditEvent({
      userId: profile.id,
      schoolId: profile.schoolId || undefined,
      branchId: profile.branchId || undefined,
      action: "UPDATE",
      entityType: "USER",
      entityId: profile.id,
      newValues: { action: "PASSWORD_RESET_REQUESTED" },
    })
  }

  return { success: true }
}

// ─── Reset Password ────────────────────────────────────────────
export async function resetPassword(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const password = formData.get("password") as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: "Failed to reset password. Please try again." }
  }

  // Get user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { schoolId: true, branchId: true },
    })

    // Audit log
    await logAuditEvent({
      userId: user.id,
      schoolId: profile?.schoolId || undefined,
      branchId: profile?.branchId || undefined,
      action: "UPDATE",
      entityType: "USER",
      entityId: user.id,
      newValues: { action: "PASSWORD_RESET_COMPLETED" },
    })
  }

  redirect("/login")
}

// ─── Signup (Legacy) ──────────────────────────────────────────
export async function signup(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()

  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const firstName = (formData.get("firstName") as string)?.trim()
  const lastName = (formData.get("lastName") as string)?.trim()
  const role = (formData.get("role") as Role) || "STUDENT"

  if (!SELF_REGISTER_ROLES.includes(role)) {
    return { error: "Invalid role selected." }
  }

  if (!email || !password || !firstName || !lastName) {
    return { error: "All fields are required." }
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    return { error: passwordError }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, role },
    },
  })

  if (error) {
    return { error: "Failed to create account. Please try again." }
  }

  if (data.user) {
    await prisma.profile.create({
      data: {
        id: data.user.id,
        email,
        firstName,
        lastName,
        role,
        status: "ACTIVE",
        isActive: true,
      },
    })
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { success: true }
  }

  const redirectPath = getRedirectPath(role)
  revalidatePath("/", "layout")
  redirect(redirectPath)
}

// ─── Update User ──────────────────────────────────────────────
export async function updateUser(
  userId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { profile: currentProfile } = await requireInvitePermission()

  const targetProfile = await prisma.profile.findUnique({ where: { id: userId } })
  if (!targetProfile) return { error: "User not found." }

  if (currentProfile.role !== "SUPER_ADMIN" && targetProfile.schoolId !== currentProfile.schoolId) {
    return { error: "Unauthorized" }
  }

  const firstName = (formData.get("firstName") as string)?.trim()
  const lastName = (formData.get("lastName") as string)?.trim()
  const role = formData.get("role") as Role
  const phone = (formData.get("phone") as string)?.trim() || null
  const isActive = formData.get("isActive") === "true"

  if (!firstName || !lastName || !role) {
    return { error: "All required fields must be filled." }
  }

  if (currentProfile.role === "SCHOOL_ADMIN" && RESTRICTED_ROLES_FOR_SCHOOL_ADMIN.includes(role)) {
    return { error: "You cannot assign this role." }
  }

  await prisma.profile.update({
    where: { id: userId },
    data: { firstName, lastName, role, phone, isActive },
  })

  await logAuditEvent({
    userId: currentProfile.id,
    schoolId: currentProfile.schoolId || undefined,
    branchId: currentProfile.branchId || undefined,
    action: "UPDATE",
    entityType: "USER",
    entityId: userId,
    newValues: { firstName, lastName, role, phone, isActive },
  })

  revalidatePath("/dashboard/users")
  return { success: true }
}

// ─── Delete User ──────────────────────────────────────────────
export async function deleteUser(userId: string) {
  const { profile: currentProfile } = await requireInvitePermission()

  const targetProfile = await prisma.profile.findUnique({ where: { id: userId } })
  if (!targetProfile) return { error: "User not found." }

  if (currentProfile.role !== "SUPER_ADMIN" && targetProfile.schoolId !== currentProfile.schoolId) {
    return { error: "Unauthorized" }
  }

  if (targetProfile.id === currentProfile.id) {
    return { error: "You cannot delete your own account." }
  }

  const serviceClient = await createServiceClient()
  await serviceClient.auth.admin.deleteUser(userId)

  await prisma.profile.delete({ where: { id: userId } })

  await logAuditEvent({
    userId: currentProfile.id,
    schoolId: currentProfile.schoolId || undefined,
    branchId: currentProfile.branchId || undefined,
    action: "DELETE",
    entityType: "USER",
    entityId: userId,
    newValues: { email: targetProfile.email, role: targetProfile.role },
  })

  revalidatePath("/dashboard/users")
  return { success: true }
}

// ─── Helper: Require Invite Permission ─────────────────────────
async function requireInvitePermission() {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  if (!profile) {
    redirect("/login")
  }

  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(profile.role)) {
    throw new Error("Unauthorized")
  }

  return { user, profile }
}
