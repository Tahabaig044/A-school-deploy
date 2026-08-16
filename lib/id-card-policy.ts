import { prisma } from "@/lib/prisma"

export const ID_CARD_POLICY_KEYS = {
  ENABLED: "id_card_enabled",
  ADMIN_ENABLED: "id_card_enabled_admin",
  STAFF_ATTENDANCE: "id_card_staff_attendance",
} as const

export interface IdCardPolicy {
  enabled: boolean
  adminEnabled: boolean
  staffAttendance: boolean
}

/**
 * Per-school ID card policy, stored in the `settings` table
 * (same mechanism as `attendance_policy`). Missing keys fall back to safe defaults.
 */
export async function getCardPolicy(schoolId: string): Promise<IdCardPolicy> {
  if (!schoolId) {
    return { enabled: false, adminEnabled: false, staffAttendance: false }
  }

  const rows = await prisma.setting.findMany({
    where: { schoolId, key: { in: Object.values(ID_CARD_POLICY_KEYS) } },
    select: { key: true, value: true },
  })

  const map = new Map(rows.map((r) => [r.key, r.value]))
  const parse = (key: string, fallback: boolean) => {
    const value = map.get(key)
    if (value === undefined) return fallback
    return value.toLowerCase() === "true"
  }

  return {
    enabled: parse(ID_CARD_POLICY_KEYS.ENABLED, true),
    adminEnabled: parse(ID_CARD_POLICY_KEYS.ADMIN_ENABLED, false),
    staffAttendance: parse(ID_CARD_POLICY_KEYS.STAFF_ATTENDANCE, true),
  }
}
