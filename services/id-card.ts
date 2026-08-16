import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getCardPolicy, type IdCardPolicy } from "@/lib/id-card-policy"
import { deriveQrToken, hashQrToken } from "@/lib/qr-token"
import { ROLES, type Role } from "@/lib/constants"

const ALL_ROLES = Object.values(ROLES) as Role[]
const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL"]
const VERIFIER_ROLES: Role[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER"]

export type CardRole =
  | "STUDENT"
  | "TEACHER"
  | "STAFF"
  | "PARENT"
  | "SCHOOL_ADMIN"
  | "SUPER_ADMIN"
  | "BRANCH_ADMIN"
  | "PRINCIPAL"

export type CardStatusValue = "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED"

export interface IdCardDetailRow {
  label: string
  value: string | null
}

export interface IdCardChild {
  id: string
  name: string
  className: string
}

export interface IdCardData {
  userId: string
  profileId: string | null
  role: CardRole
  cardId: string | null
  cardNumber: string
  cardStatus: CardStatusValue
  name: string
  photo: string | null
  school: {
    id: string
    name: string
    logoUrl: string | null
    address: string | null
    phone: string | null
  }
  branch: { id: string; name: string } | null
  identity: { label: string; value: string }
  details: IdCardDetailRow[]
  children: IdCardChild[]
  attendanceEligible: boolean
  qrToken: string | null
  issuedAt: string | null
  expiresAt: string | null
}

export interface IdCardVerificationData {
  userId: string
  studentId: string | null
  name: string
  role: string
  cardNumber: string
  school: { id: string; name: string } | null
  branch: { id: string; name: string } | null
  identity: { label: string; value: string }
  details: IdCardDetailRow[]
  attendanceEligible: boolean
}

export interface IdCardVerification {
  verified: boolean
  reason?: string
  data?: IdCardVerificationData
}

export interface AuthProfile {
  id: string
  role: Role
  schoolId: string | null
  branchId: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarUrl?: string | null
}

interface CardRow {
  id: string
  cardNumber: string
  status: CardStatusValue
  branchId: string | null
  photoUrl: string | null
  issuedAt: Date
  expiresAt: Date | null
}

interface StudentEnrollmentLike {
  rollNumber: string | null
  class?: { name: string } | null
  section?: { name: string } | null
}

interface Subject {
  cardRole: CardRole
  userId: string
  profile: AuthProfile | null
  entity: any
  photo: string | null
  name: string
  schoolId: string | null
  branchId: string | null
  email: string | null
}

const CARD_PREFIX: Record<string, string> = {
  STUDENT: "STU",
  TEACHER: "TEA",
  STAFF: "STF",
  PARENT: "PAR",
}

function cardPrefix(role: CardRole): string {
  return CARD_PREFIX[role] ?? "ADM"
}

// ─── Card number generation ──────────────────────────────────────────────

async function generateCardNumber(role: CardRole): Promise<string> {
  const prefix = cardPrefix(role)
  for (let i = 0; i < 20; i++) {
    const count = await prisma.idCard.count({
      where: { cardNumber: { startsWith: `${prefix}-` } },
    })
    const number = `${prefix}-${String(count + 1 + i).padStart(7, "0")}`
    const exists = await prisma.idCard.findUnique({ where: { cardNumber: number } })
    if (!exists) return number
  }
  return `${prefix}-${String(Math.floor(10000000 + Math.random() * 89999999))}`
}

function synthesizedNumber(subject: Subject): string {
  const e = subject.entity
  const raw =
    subject.cardRole === "STUDENT" && e?.admissionNo
      ? e.admissionNo
      : subject.cardRole === "STUDENT" && e?.id
        ? e.id.slice(0, 8)
        : subject.userId.slice(0, 8)
  return `${cardPrefix(subject.cardRole)}-${String(raw).toUpperCase()}`
}

// ─── Subject resolution (Profile → role entity) ──────────────────────────

function makeSubject(
  cardRole: CardRole,
  profile: AuthProfile,
  entity: any,
  photo: string | null
): Subject {
  const schoolId = entity?.schoolId ?? profile.schoolId
  const branchId = entity?.branchId ?? profile.branchId
  const name =
    entity && entity.firstName && entity.lastName
      ? `${entity.firstName} ${entity.lastName}`.trim()
      : `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
  return {
    cardRole,
    userId: profile.id,
    profile,
    entity,
    photo: photo ?? profile.avatarUrl ?? null,
    name: name || profile.email || profile.id,
    schoolId: schoolId ?? null,
    branchId: branchId ?? null,
    email: entity?.email ?? profile.email ?? null,
  }
}

function makeSubjectFromStudent(student: any, profile: AuthProfile | null): Subject {
  return {
    cardRole: "STUDENT",
    userId: profile?.id ?? student.id,
    profile: profile ?? null,
    entity: student,
    photo: student.photoUrl ?? profile?.avatarUrl ?? null,
    name: `${student.firstName} ${student.lastName}`.trim(),
    schoolId: student.schoolId,
    branchId: student.branchId,
    email: student.email ?? null,
  }
}

async function resolveSubject(profile: AuthProfile): Promise<Subject | null> {
  if (profile.role === "STUDENT") {
    const student = await prisma.student.findFirst({ where: { email: profile.email ?? "" } })
    if (student) return makeSubject("STUDENT", profile, student, student.photoUrl)
  }
  if (profile.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { profileId: profile.id } })
    if (teacher) return makeSubject("TEACHER", profile, teacher, teacher.photoUrl)
  }
  if (profile.role === "PARENT") {
    const parent = await prisma.parent.findFirst({
      where: { OR: [{ profileId: profile.id }, { email: profile.email ?? undefined }] },
    })
    if (parent) return makeSubject("PARENT", profile, parent, profile.avatarUrl ?? null)
  }
  const staff = await prisma.staff.findFirst({ where: { profileId: profile.id } })
  if (staff) return makeSubject("STAFF", profile, staff, staff.photoUrl ?? profile.avatarUrl ?? null)
  if (ADMIN_ROLES.includes(profile.role)) {
    return makeSubject(profile.role as CardRole, profile, null, profile.avatarUrl ?? null)
  }
  return null
}

// ─── Card record (create / retrieve) ─────────────────────────────────────

async function getOrCreateIdCard(subject: Subject): Promise<CardRow | null> {
  if (!subject.profile || !subject.schoolId) return null
  const existing = await prisma.idCard.findUnique({ where: { profileId: subject.profile.id } })
  if (existing) return existing

  const cardId = randomUUID()
  const cardNumber = await generateCardNumber(subject.cardRole)
  try {
    return await prisma.idCard.create({
      data: {
        id: cardId,
        profileId: subject.profile.id,
        schoolId: subject.schoolId,
        branchId: subject.branchId ?? null,
        cardRole: subject.cardRole,
        cardNumber,
        status: "ACTIVE",
        qrTokenHash: hashQrToken(deriveQrToken(cardId)),
        issuedAt: new Date(),
      },
    })
  } catch (e: any) {
    if (e?.code === "P2002") {
      const nowExisting = await prisma.idCard.findUnique({ where: { profileId: subject.profile.id } })
      if (nowExisting) return nowExisting
    }
    throw e
  }
}

// ─── Card data assembly ──────────────────────────────────────────────────

async function loadStudentEnrollment(studentId: string): Promise<StudentEnrollmentLike | null> {
  return prisma.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    include: {
      class: { select: { name: true } },
      section: { select: { name: true } },
      academicSession: { select: { isCurrent: true } },
    },
    orderBy: [{ academicSession: { isCurrent: "desc" } }, { enrollmentDate: "desc" }],
  })
}

function studentDetailRows(enrollment?: StudentEnrollmentLike | null): IdCardDetailRow[] {
  return [
    { label: "Class", value: enrollment?.class?.name ?? null },
    { label: "Section", value: enrollment?.section?.name ?? null },
    { label: "Roll No", value: enrollment?.rollNumber ?? null },
  ]
}

function identityFor(subject: Subject): { label: string; value: string } {
  const e = subject.entity
  switch (subject.cardRole) {
    case "STUDENT":
      return { label: "Student ID", value: e?.admissionNo ?? e?.id?.slice(0, 8) }
    case "TEACHER":
      return { label: "Employee ID", value: e?.employeeCode ?? e?.id?.slice(0, 8) }
    case "STAFF":
      return { label: "Employee ID", value: e?.employeeCode ?? e?.id?.slice(0, 8) }
    case "PARENT":
      return {
        label: "Parent ID",
        value: (e?.id ?? subject.userId).slice(0, 8).toUpperCase(),
      }
    default:
      return { label: "Admin", value: subject.cardRole }
  }
}

async function detailsFor(
  subject: Subject,
  preloadedEnrollment?: StudentEnrollmentLike | null
): Promise<IdCardDetailRow[]> {
  const e = subject.entity
  switch (subject.cardRole) {
    case "STUDENT":
      return studentDetailRows(preloadedEnrollment ?? (await loadStudentEnrollment(e?.id)))
    case "TEACHER":
      return [
        { label: "Department", value: e?.department ?? e?.specialization ?? null },
        { label: "Designation", value: e?.designation ?? null },
      ]
    case "STAFF":
      return [
        { label: "Designation", value: e?.designation ?? null },
        { label: "Department", value: e?.department ?? null },
      ]
    case "PARENT":
      return [{ label: "Relationship", value: e?.relationship ?? null }]
    default:
      return []
  }
}

async function childrenFor(subject: Subject): Promise<IdCardChild[]> {
  const parent = subject.entity
  if (!parent) return []
  const links = await prisma.studentParent.findMany({
    where: { parentId: parent.id },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          enrollments: {
            where: { status: "ACTIVE" },
            take: 1,
            include: { class: { select: { name: true } } },
          },
        },
      },
    },
  })
  return links.map((l) => ({
    id: l.student.id,
    name: `${l.student.firstName} ${l.student.lastName}`.trim(),
    className: l.student.enrollments[0]?.class?.name ?? "",
  }))
}

function attendanceFor(subject: Subject, policy: IdCardPolicy): boolean {
  switch (subject.cardRole) {
    case "STUDENT":
    case "TEACHER":
      return true
    case "STAFF":
      return policy.staffAttendance
    default:
      return false
  }
}

async function buildCardData(
  subject: Subject,
  card: CardRow | null,
  policy: IdCardPolicy,
  preloadedEnrollment?: StudentEnrollmentLike | null
): Promise<IdCardData> {
  const school = subject.schoolId
    ? await prisma.school.findUnique({
        where: { id: subject.schoolId },
        select: { id: true, name: true, logoUrl: true, address: true, phone: true },
      })
    : null

  const branchId = card?.branchId ?? subject.branchId
  const branch = branchId
    ? await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, name: true },
      })
    : null

  return {
    userId: subject.userId,
    profileId: subject.profile?.id ?? null,
    role: subject.cardRole,
    cardId: card?.id ?? null,
    cardNumber: card?.cardNumber ?? synthesizedNumber(subject),
    cardStatus: card?.status ?? "ACTIVE",
    name: subject.name,
    photo: card?.photoUrl ?? subject.photo,
    school: school
      ? {
          id: school.id,
          name: school.name,
          logoUrl: school.logoUrl,
          address: school.address,
          phone: school.phone,
        }
      : { id: subject.schoolId ?? "", name: "School", logoUrl: null, address: null, phone: null },
    branch: branch ? { id: branch.id, name: branch.name } : null,
    identity: identityFor(subject),
    details: await detailsFor(subject, preloadedEnrollment),
    children: subject.cardRole === "PARENT" ? await childrenFor(subject) : [],
    attendanceEligible: attendanceFor(subject, policy),
    qrToken: card ? deriveQrToken(card.id) : null,
    issuedAt: card?.issuedAt ? card.issuedAt.toISOString() : null,
    expiresAt: card?.expiresAt ? card.expiresAt.toISOString() : null,
  }
}

// ─── Authorization ───────────────────────────────────────────────────────

async function checkProfileAccess(actor: AuthProfile, target: AuthProfile): Promise<boolean> {
  if (actor.id === target.id) return true
  if (actor.role === "SUPER_ADMIN") return true
  if (ADMIN_ROLES.includes(actor.role)) {
    if (!target.schoolId || target.schoolId !== actor.schoolId) return false
    if (actor.role === "BRANCH_ADMIN" && actor.branchId && target.branchId && target.branchId !== actor.branchId) {
      return false
    }
    return true
  }
  if (actor.role === "PARENT") {
    const parent = await prisma.parent.findFirst({
      where: { OR: [{ profileId: actor.id }, { email: actor.email ?? undefined }] },
    })
    if (!parent) return false
    const childStudent = await prisma.student.findFirst({ where: { email: target.email ?? "" } })
    if (!childStudent) return false
    const link = await prisma.studentParent.findFirst({
      where: { parentId: parent.id, studentId: childStudent.id },
    })
    return !!link
  }
  return false
}

// ─── Public API ──────────────────────────────────────────────────────────

/** Current user's own ID card (any authenticated role; gated by policy + role eligibility). */
export async function getMyIdCard(): Promise<IdCardData | null> {
  const { profile } = await requireRole(...ALL_ROLES)
  return getMyIdCardForProfile(profile)
}

/** Cookie-free variant used by the mobile API (already-authenticated profile). */
export async function getMyIdCardForProfile(profile: AuthProfile): Promise<IdCardData | null> {
  return getCardForProfile(profile)
}

async function getCardForProfile(profile: AuthProfile): Promise<IdCardData | null> {
  const policy = await getCardPolicy(profile.schoolId ?? "")
  if (!policy.enabled) return null
  const subject = await resolveSubject(profile)
  if (!subject) return null
  if (ADMIN_ROLES.includes(profile.role) && !policy.adminEnabled) return null
  const card = await getOrCreateIdCard(subject)
  return buildCardData(subject, card, policy)
}

/** Authorized cross-user lookup (admins for managed users; parents for their children). */
export async function getIdCardDataForUser(targetProfileId: string): Promise<IdCardData | null> {
  const { profile: actor } = await requireRole(...ALL_ROLES)
  return getIdCardDataForUserForProfile(actor, targetProfileId)
}

/** Cookie-free variant used by the mobile API. */
export async function getIdCardDataForUserForProfile(
  actor: AuthProfile,
  targetProfileId: string
): Promise<IdCardData | null> {
  const target = await prisma.profile.findUnique({ where: { id: targetProfileId } })
  if (!target) return null
  const allowed = await checkProfileAccess(actor, target)
  if (!allowed) return null
  const policy = await getCardPolicy(target.schoolId ?? "")
  if (!policy.enabled) return null
  const subject = await resolveSubject(target)
  if (!subject) return null
  const card = await getOrCreateIdCard(subject)
  return buildCardData(subject, card, policy)
}

/**
 * Student lookup used by the admin dashboard and parent portal.
 * Student records are resolved by id (not profile id), so this works for
 * students that may not yet have a linked auth profile.
 */
export async function getStudentIdCardData(studentId: string): Promise<IdCardData | null> {
  const { profile: actor } = await requireRole(...ALL_ROLES)
  return getStudentIdCardDataForProfile(actor, studentId)
}

/** Cookie-free variant used by the mobile API. */
export async function getStudentIdCardDataForProfile(
  actor: AuthProfile,
  studentId: string
): Promise<IdCardData | null> {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return null

  if (actor.role !== "SUPER_ADMIN") {
    if (student.schoolId !== actor.schoolId) return null
    if (
      actor.role === "BRANCH_ADMIN" &&
      actor.branchId &&
      student.branchId &&
      student.branchId !== actor.branchId
    ) {
      return null
    }
    if (actor.role === "PARENT") {
      const parent = await prisma.parent.findFirst({
        where: { OR: [{ profileId: actor.id }, { email: actor.email ?? undefined }] },
      })
      const link = parent
        ? await prisma.studentParent.findFirst({ where: { parentId: parent.id, studentId } })
        : null
      if (!link) return null
    } else if (actor.role === "STUDENT") {
      const own = await prisma.student.findFirst({ where: { id: studentId, email: actor.email ?? "" } })
      if (!own) return null
    }
  }

  const policy = await getCardPolicy(student.schoolId)
  if (!policy.enabled) return null
  const profile = await prisma.profile.findFirst({ where: { email: student.email ?? "" } })
  const subject = makeSubjectFromStudent(student, profile)
  const card = profile ? await getOrCreateIdCard(subject) : null
  return buildCardData(subject, card, policy)
}

/** Bulk student card data for the admin generator (class/section/session). */
export async function getBulkStudentIdCardData(
  schoolId: string,
  classId: string,
  sectionId?: string,
  sessionId?: string
): Promise<IdCardData[]> {
  const { profile: actor } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER"
  )
  return getBulkStudentIdCardDataForProfile(actor, schoolId, classId, sectionId, sessionId)
}

/** Cookie-free variant used by the mobile API. */
export async function getBulkStudentIdCardDataForProfile(
  actor: AuthProfile,
  schoolId: string,
  classId: string,
  sectionId?: string,
  sessionId?: string
): Promise<IdCardData[]> {
  if (actor.role !== "SUPER_ADMIN" && actor.schoolId !== schoolId) return []
  if (actor.role === "BRANCH_ADMIN" && actor.branchId) {
    if (actor.schoolId !== schoolId) return []
  }

  const normalizedSectionId = sectionId && sectionId !== "all" ? sectionId : undefined
  const where: any = {
    schoolId,
    ...(actor.role === "BRANCH_ADMIN" && actor.branchId ? { branchId: actor.branchId } : {}),
    enrollments: {
      some: {
        classId,
        ...(normalizedSectionId ? { sectionId: normalizedSectionId } : {}),
        ...(sessionId ? { academicSessionId: sessionId } : {}),
        status: "ACTIVE",
      },
    },
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      enrollments: {
        where: {
          classId,
          ...(normalizedSectionId ? { sectionId: normalizedSectionId } : {}),
          status: "ACTIVE",
        },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  const policy = await getCardPolicy(schoolId)
  const out: IdCardData[] = []
  for (const student of students) {
    const profile = await prisma.profile.findFirst({ where: { email: student.email ?? "" } })
    const subject = makeSubjectFromStudent(student, profile)
    const card = profile ? await getOrCreateIdCard(subject) : null
    out.push(await buildCardData(subject, card, policy, student.enrollments[0] ?? null))
  }
  return out
}

// ─── QR verification ─────────────────────────────────────────────────────

/** Restrict QR verification to staff/teachers/admins (attendance-ready). */
export async function requireIdCardVerifier(): Promise<void> {
  const { profile } = await requireRole(...ALL_ROLES)
  const isStaff = await prisma.staff.findFirst({ where: { profileId: profile.id } })
  if (!VERIFIER_ROLES.includes(profile.role) && !isStaff) {
    throw new Error("Forbidden")
  }
}

/** Cookie-free variant used by the mobile API. Returns whether the profile may verify cards. */
export async function requireIdCardVerifierForProfile(profile: AuthProfile): Promise<boolean> {
  const isStaff = await prisma.staff.findFirst({ where: { profileId: profile.id } })
  return VERIFIER_ROLES.includes(profile.role) || !!isStaff
}

export async function verifyIdCardToken(
  token: string,
  verifier?: { role: Role; schoolId: string | null; id: string }
): Promise<IdCardVerification> {
  const hash = hashQrToken(token)
  const card = await prisma.idCard.findUnique({
    where: { qrTokenHash: hash },
    include: {
      profile: true,
      school: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  })
  if (!card) return { verified: false, reason: "INVALID_TOKEN" }
  if (card.status === "REVOKED") return { verified: false, reason: "REVOKED" }
  if (card.status === "INACTIVE") return { verified: false, reason: "INACTIVE" }
  if (card.status === "EXPIRED") return { verified: false, reason: "EXPIRED" }
  if (card.expiresAt && card.expiresAt < new Date()) return { verified: false, reason: "EXPIRED" }

  const policy = await getCardPolicy(card.schoolId)
  if (!policy.enabled) return { verified: false, reason: "INACTIVE" }

  // Tenant isolation: a verifier may only verify cards issued by their own
  // school. SUPER_ADMIN (no school) is exempt.
  if (verifier && verifier.schoolId && verifier.schoolId !== card.schoolId) {
    return { verified: false, reason: "UNAUTHORIZED" }
  }

  const subject = await resolveSubject(card.profile)
  if (!subject) return { verified: false, reason: "INVALID_TOKEN" }

  const name =
    card.profile.firstName && card.profile.lastName
      ? `${card.profile.firstName} ${card.profile.lastName}`.trim()
      : card.profile.email ?? card.profile.id

  return {
    verified: true,
    data: {
      userId: card.profile.id,
      studentId: subject.cardRole === "STUDENT" ? (subject.entity?.id ?? null) : null,
      name,
      role: card.cardRole,
      cardNumber: card.cardNumber,
      school: card.school,
      branch: card.branch,
      identity: identityFor(subject),
      details: await detailsFor(subject),
      attendanceEligible: attendanceFor(subject, policy),
    },
  }
}

// ─── Admin management ────────────────────────────────────────────────────

export async function updateIdCardStatus(
  profileId: string,
  status: CardStatusValue
): Promise<{ success?: boolean; error?: string }> {
  const { profile: actor } = await requireRole(...ADMIN_ROLES)
  const card = await prisma.idCard.findUnique({ where: { profileId } })
  if (!card) return { error: "Card not found." }
  if (actor.role !== "SUPER_ADMIN") {
    const target = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!target || target.schoolId !== actor.schoolId) return { error: "Unauthorized." }
    if (
      actor.role === "BRANCH_ADMIN" &&
      actor.branchId &&
      target.branchId &&
      target.branchId !== actor.branchId
    ) {
      return { error: "Unauthorized." }
    }
  }
  await prisma.idCard.update({ where: { profileId }, data: { status } })
  return { success: true }
}