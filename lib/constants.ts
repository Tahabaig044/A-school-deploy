export const PORTAL_ROLES = ["STUDENT", "PARENT", "TEACHER"] as const

export type PortalRole = (typeof PORTAL_ROLES)[number]

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  BRANCH_ADMIN: "BRANCH_ADMIN",
  PRINCIPAL: "PRINCIPAL",
  TEACHER: "TEACHER",
  ACCOUNTANT: "ACCOUNTANT",
  ADMISSION_OFFICER: "ADMISSION_OFFICER",
  LIBRARIAN: "LIBRARIAN",
  TRANSPORT_MANAGER: "TRANSPORT_MANAGER",
  PARENT: "PARENT",
  STUDENT: "STUDENT",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  LEAVE: "LEAVE",
} as const

export const GENDER = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const

export const BLOOD_GROUP = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
} as const
