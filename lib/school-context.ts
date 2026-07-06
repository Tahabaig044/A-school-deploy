export class MissingSchoolContextError extends Error {
  constructor(action: string) {
    super(
      `${action}: No school or branch context found. ` +
      `Ensure your profile is assigned to a school and branch before performing this action.`
    )
    this.name = "MissingSchoolContextError"
  }
}

/** Minimal shape — only what the helpers need. */
interface ProfileLike {
  schoolId: string | null
  branchId: string | null
}

/**
 * Extracts and validates schoolId/branchId from formData (fallback to profile).
 * Throws a clear error if the resolved ID is null.
 */
export function getSchoolId(
  profile: ProfileLike,
  formData?: FormData | null,
  action = "Action"
): string {
  const schoolId =
    (formData?.get("schoolId") as string) || profile.schoolId
  if (!schoolId) throw new MissingSchoolContextError(action)
  return schoolId
}

export function getBranchId(
  profile: ProfileLike,
  formData?: FormData | null,
  action = "Action"
): string {
  const branchId =
    (formData?.get("branchId") as string) || profile.branchId
  if (!branchId) throw new MissingSchoolContextError(action)
  return branchId
}

/**
 * Returns branchId if present, or undefined (for optional branch relations).
 */
export function getOptionalBranchId(
  profile: ProfileLike,
  formData?: FormData | null
): string | undefined {
  const branchId =
    (formData?.get("branchId") as string) || profile.branchId
  return branchId || undefined
}
