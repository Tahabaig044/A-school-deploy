"use server"

import {
  getMyIdCard,
  getStudentIdCardData,
  getIdCardDataForUser,
  getBulkStudentIdCardData,
  requireIdCardVerifier,
  verifyIdCardToken,
  updateIdCardStatus,
  type IdCardData,
  type IdCardVerification,
  type CardStatusValue,
} from "@/services/id-card"
import { getCurrentProfile } from "@/lib/auth"

export async function getMyIdCardAction(): Promise<IdCardData | null> {
  return getMyIdCard()
}

export async function getStudentIdCardDataAction(studentId: string): Promise<IdCardData | null> {
  return getStudentIdCardData(studentId)
}

export async function getIdCardDataForUserAction(profileId: string): Promise<IdCardData | null> {
  return getIdCardDataForUser(profileId)
}

export async function getBulkStudentIdCardDataAction(
  schoolId: string,
  classId: string,
  sectionId?: string,
  sessionId?: string,
): Promise<IdCardData[]> {
  return getBulkStudentIdCardData(schoolId, classId, sectionId, sessionId)
}

export async function verifyIdCardTokenAction(token: string): Promise<IdCardVerification> {
  await requireIdCardVerifier()
  const profile = await getCurrentProfile()
  return verifyIdCardToken(token, {
    role: profile?.role ?? "STUDENT",
    schoolId: profile?.schoolId ?? null,
    id: profile?.id ?? "",
  })
}

export async function updateIdCardStatusAction(
  profileId: string,
  status: CardStatusValue,
): Promise<{ success?: boolean; error?: string }> {
  return updateIdCardStatus(profileId, status)
}
