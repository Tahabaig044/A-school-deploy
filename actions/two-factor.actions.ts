"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorForLogin,
} from "@/lib/two-factor"
import QRCode from "qrcode"
import { z } from "zod"

const verifySchema = z.object({
  token: z.string().length(6, "Code must be 6 digits"),
})

export async function initiateTwoFactorSetup() {
  const user = await requireAuth()

  const setup = await setupTwoFactor(user.id)

  const qrDataUrl = await QRCode.toDataURL(setup.otpauthUrl)

  return { qrDataUrl, secret: setup.secret }
}

export async function confirmTwoFactorSetup(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const user = await requireAuth()
  const token = formData.get("token") as string

  const parsed = verifySchema.safeParse({ token })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await enableTwoFactor(user.id, token)
    revalidatePath("/dashboard/settings")
    return { success: true, error: undefined }
  } catch (e: any) {
    return { error: e.message || "Failed to enable 2FA", success: false }
  }
}

export async function turnOffTwoFactor() {
  const user = await requireAuth()

  try {
    await disableTwoFactor(user.id)
    revalidatePath("/dashboard/settings")
    return { success: true, error: undefined }
  } catch (e: any) {
    return { error: e.message || "Failed to disable 2FA", success: false }
  }
}

export async function verifyTwoFactorLogin(userId: string, token: string) {
  return verifyTwoFactorForLogin(userId, token)
}
