import * as OTPAuth from "otpauth"
import { prisma } from "@/lib/prisma"

const APP_NAME = "SchoolManagement"

export function generateTwoFactorSecret(email: string, schoolName?: string) {
  const totp = new OTPAuth.TOTP({
    issuer: schoolName || APP_NAME,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  })

  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
  }
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

export async function enableTwoFactor(userId: string, token: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!profile) throw new Error("User not found")
  if (profile.twoFactorEnabled) throw new Error("2FA already enabled")
  if (!profile.twoFactorSecret) throw new Error("2FA setup not initiated")

  const isValid = verifyTwoFactorToken(profile.twoFactorSecret, token)
  if (!isValid) throw new Error("Invalid verification code")

  await prisma.profile.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
    },
  })

  return true
}

export async function disableTwoFactor(userId: string) {
  await prisma.profile.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorVerifiedAt: null,
    },
  })

  return true
}

export async function setupTwoFactor(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabled: true },
  })

  if (!profile) throw new Error("User not found")
  if (profile.twoFactorEnabled) throw new Error("2FA already enabled")
  if (!profile.email) throw new Error("Email not found")

  const { secret, otpauthUrl } = generateTwoFactorSecret(profile.email)

  await prisma.profile.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  })

  return { secret, otpauthUrl }
}

export async function verifyTwoFactorForLogin(userId: string, token: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!profile?.twoFactorEnabled || !profile.twoFactorSecret) {
    return true
  }

  return verifyTwoFactorToken(profile.twoFactorSecret, token)
}
