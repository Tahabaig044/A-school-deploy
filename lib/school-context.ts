export class MissingSchoolContextError extends Error {
  constructor(action: string) {
    super(
      `${action}: No school or branch context found. ` +
        `Ensure your profile is assigned to a school and branch before performing this action.`,
    )
    this.name = "MissingSchoolContextError"
  }
}

/** Minimal shape — only what the helpers need. */
interface ProfileLike {
  role: string
  schoolId: string | null
  branchId: string | null
}

/**
 * Returns the schoolId, enforcing isolation:
 * - SUPER_ADMIN: may override via formData (manages all schools)
 * - All other roles: always uses profile.schoolId (formData ignored)
 */
export function getSchoolId(
  profile: ProfileLike,
  formData?: FormData | null,
  action = "Action",
): string {
  const schoolId =
    profile.role === "SUPER_ADMIN"
      ? (formData?.get("schoolId") as string) || profile.schoolId
      : profile.schoolId
  if (!schoolId) throw new MissingSchoolContextError(action)
  return schoolId
}

/**
 * Returns the branchId, enforcing isolation:
 * - SUPER_ADMIN: may override via formData (manages all branches)
 * - All other roles: always uses profile.branchId (formData ignored)
 */
export function getBranchId(
  profile: ProfileLike,
  formData?: FormData | null,
  action = "Action",
): string {
  const branchId =
    profile.role === "SUPER_ADMIN"
      ? (formData?.get("branchId") as string) || profile.branchId
      : profile.branchId
  if (!branchId) throw new MissingSchoolContextError(action)
  return branchId
}

/**
 * Returns branchId if present, or undefined (for optional branch relations).
 * Only SUPER_ADMIN may override via formData.
 */
export function getOptionalBranchId(
  profile: ProfileLike,
  formData?: FormData | null,
): string | undefined {
  const branchId =
    profile.role === "SUPER_ADMIN"
      ? (formData?.get("branchId") as string) || profile.branchId
      : profile.branchId
  return branchId || undefined
}
