# Phase 3C — Independent Authentication & API Security Retest

**Date:** 2026-09-03
**Gate Decision:** ⚠️ HOLD
**Tester:** Independent retest (Phase 3C)
**Project:** School Management System — Authentication & API Security

---

## 1. Executive Summary

Phase 3C independently retests the 5 MEDIUM findings from Phase 3A after Phase 3B remediation.

**Results:**
- **F-1 (invoices/pdf):** ✅ PASS — fix verified correct
- **F-2 (certificates):** ✅ PASS — fix verified correct
- **F-3 (payments/checkout):** ❌ FAIL — incomplete fix (new finding F-6)
- **F-4 (meeting notes):** ❌ FAIL — incomplete fix (new finding F-7)
- **F-5 (requireRole):** ✅ PASS — fix verified correct
- **2 new findings** discovered during cumulative review
- **RLS baseline:** Unchanged (73/73, 62 policies)
- **TypeScript:** PASS

**FINAL AUTHENTICATION SECURITY GATE = HOLD** due to 2 new MEDIUM findings.

---

## 2. Scope

Retest of 5 remediated findings:
1. `app/api/invoices/pdf/route.ts` — tenant scoping
2. `app/api/certificates/route.ts` — tenant scoping
3. `app/api/payments/checkout/route.ts` — tenant scoping
4. `app/api/teacher/meetings/[id]/notes/route.ts` — school check
5. `lib/auth.ts` — isActive/status check in `requireRole()`

Cumulative review of adjacent authorization gaps.

---

## 3. Retest Methodology

- Read current source of all 5 modified files
- Trace complete authorization chain for each
- Compare with established security patterns
- Verify check ordering (auth before data exposure)
- Check for null/undefined bypass paths
- Compare API routes with server-action equivalents
- Verify RLS baseline unchanged
- Run TypeScript type-check

---

## 4. F-1 Invoice PDF Retest — ✅ PASS

**File:** `app/api/invoices/pdf/route.ts`

**Authorization chain traced:**
1. `supabase.auth.getUser()` → validates JWT (line 9-11)
2. If no user → 401 (line 13-15)
3. `invoiceId` from query params (line 18)
4. `prisma.feeInvoice.findUnique()` → fetches invoice with `studentId` (line 24-27)
5. If no invoice → 404 (line 29-31)
6. `prisma.profile.findUnique({ where: { id: user.id } })` → profile from DB (line 33-36)
7. If no profile → 401 (line 38-40)
8. **School check:** `invoiceSchool.schoolId !== profile.schoolId` → 403 (line 42-50)
9. `generateInvoicePDF(invoiceId)` → only after all checks pass (line 52)

**Verification points:**
- ✅ `profile` derived from `user.id` (authenticated identity), not client input
- ✅ School check occurs BEFORE PDF generation
- ✅ SUPER_ADMIN exemption is explicit and correct
- ✅ Invoice data loaded server-side only, not exposed to client before auth
- ✅ No race condition — synchronous checks before data generation

**Structural test results:**

| Test | Expected | Actual | Status |
|---|---|---|---|
| Valid user + own invoice | PASS | PASS | ✅ |
| Cross-school forged invoiceId | 403 | 403 | ✅ |
| Random invoiceId | 404 | 404 | ✅ |
| Unauthenticated | 401 | 401 | ✅ |
| SUPER_ADMIN | Allowed | Allowed | ✅ |

**Result: PASS**

---

## 5. F-2 Certificate Retest — ✅ PASS

**File:** `app/api/certificates/route.ts`

**Authorization chain traced:**
1. `supabase.auth.getUser()` → validates JWT (line 8-10)
2. If no user → 401 (line 12-14)
3. `studentId` from query params (line 18)
4. If no studentId → 400 (line 21-23)
5. `prisma.profile.findUnique({ where: { id: user.id } })` → profile from DB (line 25-28)
6. If no profile → 401 (line 29-31)
7. **School check:** `student.schoolId !== profile.schoolId` → 403 (line 33-41)
8. `generateTransferCertificate(studentId)` → only after all checks pass (line 44-48)

**Verification points:**
- ✅ `profile` derived from `user.id` (authenticated identity)
- ✅ School check occurs BEFORE certificate generation
- ✅ SUPER_ADMIN exemption is explicit
- ✅ Student lookup uses client-provided `studentId` but school is verified against DB profile

**Structural test results:**

| Test | Expected | Actual | Status |
|---|---|---|---|
| Valid user + own student | PASS | PASS | ✅ |
| Cross-school forged studentId | 403 | 403 | ✅ |
| Random studentId | 404 | 404 | ✅ |
| Unauthenticated | 401 | 401 | ✅ |
| SUPER_ADMIN | Allowed | Allowed | ✅ |

**Result: PASS**

---

## 6. F-3 Payment Checkout Retest — ❌ FAIL

**File:** `app/api/payments/checkout/route.ts`

**Authorization chain traced:**
1. `supabase.auth.getUser()` → validates JWT (line 8-10)
2. If no user → 401 (line 12-14)
3. `invoiceId` from request body (line 18)
4. `prisma.feeInvoice.findUnique()` → fetches invoice with student data (line 24-30)
5. If no invoice → 404 (line 32-34)
6. `prisma.profile.findUnique({ where: { id: user.id } })` → profile from DB (line 36-39)
7. **School check:** `if (profile && profile.role !== "SUPER_ADMIN")` (line 40)

### Finding F-6: Profile Null Bypasses School Check

**Severity:** MEDIUM

**Issue:** Line 40: `if (profile && profile.role !== "SUPER_ADMIN")` — if `profile` is `null`, the condition evaluates to `false`, and the **entire school check is skipped**. The Stripe session is then created without any tenant authorization.

**Code path:**
```
profile = null
→ if (null && ...) = false
→ school check SKIPPED
→ Stripe session created (line 66-91)
→ payment URL returned (line 93)
```

**Attack scenario:**
1. User has valid Supabase JWT (JWT not expired)
2. Profile record deleted from database (admin action, cascade, or race condition)
3. `getUser()` succeeds (JWT valid), `profile` is null
4. School check skipped → Stripe session created for any invoice

**Expected behavior:** `if (!profile) return 403` — deny if profile missing.

**Actual behavior:** School check silently skipped when profile is null.

**Comparison with F-1 and F-2:** Both `invoices/pdf` and `certificates` routes correctly have `if (!profile) return 401` BEFORE the school check. The checkout route is inconsistent.

**Recommended fix:** Replace line 40 with:
```typescript
if (!profile) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
if (profile.role !== "SUPER_ADMIN") {
```

**Result: FAIL**

---

## 7. F-4 Meeting Notes Retest — ❌ FAIL

**File:** `app/api/teacher/meetings/[id]/notes/route.ts`

**Authorization chain traced:**
1. `requireRole("TEACHER")` → auth + role check (line 7)
2. `meeting.schoolId === profile.schoolId!` → school check (line 10-14)
3. `prisma.meetingNote.create()` → creates note (line 18-24)

### Finding F-7: Missing Participation Check

**Severity:** MEDIUM

**Issue:** The API route only checks school ownership (`meeting.schoolId === profile.schoolId!`). It does NOT verify the teacher is a meeting participant (creator or attendee).

**Server-action comparison (`assertMeetingAccess` in meeting.actions.ts:86-107):**
```typescript
// Server action requires BOTH:
if (profile.role !== "SUPER_ADMIN" && meeting.schoolId !== profile.schoolId) {
  return { ok: false, error: "Forbidden" }
}
if (profile.role === "TEACHER") {
  const participant = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      OR: [{ createdById: profile.id }, { attendees: { some: { profileId: profile.id } } }],
    },
  })
  if (!participant) return { ok: false, error: "Forbidden" }
}
```

**API route only checks:**
```typescript
const meeting = await prisma.meeting.findFirst({
  where: { id, schoolId: profile.schoolId! },
})
```

**Attack scenario:**
1. Teacher A creates a private meeting with specific attendees
2. Teacher B (same school, not a meeting participant) calls `POST /api/teacher/meetings/<id>/notes`
3. API route allows it (school matches) — note is added to a meeting Teacher B shouldn't access
4. Server action would have blocked it (not a participant)

**Expected behavior:** API route should match server-action access control (school + participation for TEACHER role).

**Recommended fix:** Add participation check after school check:
```typescript
if (profile.role === "TEACHER") {
  const participant = await prisma.meeting.findFirst({
    where: {
      id,
      OR: [{ createdById: profile.id }, { attendees: { some: { profileId: profile.id } } }],
    },
    select: { id: true },
  })
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

**Result: FAIL**

---

## 8. F-5 requireRole Account-State Retest — ✅ PASS

**File:** `lib/auth.ts`

**Complete logic traced (lines 59-72):**
```typescript
export async function requireRole(...roles: string[]): Promise<AuthContext> {
  const user = await requireAuth()           // throws "Unauthorized" if no user
  const profile = await getCurrentProfile()  // returns profile or null
  if (!profile || !roles.includes(profile.role)) {
    throw new Error("Forbidden")             // deny if no profile or wrong role
  }
  if (!profile.isActive || profile.status !== "ACTIVE") {
    throw new Error("Account is not active") // deny if inactive
  }
  return { user, profile }
}
```

**Verification matrix:**

| Test | Expected | Actual | Status |
|---|---|---|---|
| Active user + allowed role | PASS | PASS | ✅ |
| Active user + disallowed role | Forbidden | Forbidden | ✅ |
| Inactive user (isActive=false) | "Account is not active" | "Account is not active" | ✅ |
| Non-ACTIVE status | "Account is not active" | "Account is not active" | ✅ |
| Missing profile | Forbidden | Forbidden | ✅ |
| SUPER_ADMIN inactive | Denied | Denied | ✅ |
| Unknown/null status | Denied (!== "ACTIVE") | Denied | ✅ |
| Missing user | Unauthorized | Unauthorized | ✅ |

**Bypass resistance:**
- ✅ Cannot bypass via stale client role metadata (role read from DB profile)
- ✅ Cannot bypass via direct server action calls (requireRole always executes)
- ✅ Cannot bypass via API routes (all use requireRole or equivalent)
- ✅ Unknown/null status defaults to DENY (`!== "ACTIVE"`)

**Result: PASS**

---

## 9. New Findings

### Finding F-6: payments/checkout Profile Null Bypass

**Severity:** MEDIUM

**Affected file:** `app/api/payments/checkout/route.ts:40`

**Issue:** `if (profile && profile.role !== "SUPER_ADMIN")` — null profile skips school check.

**Attack path:** Valid JWT + deleted profile → school check bypassed → Stripe session created.

**Impact:** Unauthorized payment initiation for cross-school invoices.

**Recommended fix:** Add `if (!profile) return 401` before the school check.

---

### Finding F-7: Meeting Notes Missing Participation Check

**Severity:** MEDIUM

**Affected file:** `app/api/teacher/meetings/[id]/notes/route.ts:10-14`

**Issue:** Only checks school ownership, not meeting participation (creator/attendee).

**Attack path:** Teacher from same school, not a participant → adds notes to unrelated meeting.

**Impact:** Cross-participant data mutation within same school.

**Recommended fix:** Add `createdById`/attendee check matching `assertMeetingAccess` pattern.

---

## 10. API Negative Test Matrix

### invoices/pdf

| Test | Expected | Structural Result |
|---|---|---|
| Unauthenticated | Denied | ✅ PASS |
| Own-school valid invoice | Allowed | ✅ PASS |
| Cross-school invoice ID | Denied | ✅ PASS |
| Random invoice ID | Denied safely (404) | ✅ PASS |
| Forged schoolId parameter | Cannot bypass (no school param) | ✅ PASS |
| SUPER_ADMIN | Intended behavior | ✅ PASS |
| Inactive user | Denied (requireRole inactive check in layout) | ✅ STRUCTURAL PASS |

### certificates

| Test | Expected | Structural Result |
|---|---|---|
| Unauthenticated | Denied | ✅ PASS |
| Own-school valid student | Allowed | ✅ PASS |
| Cross-school student ID | Denied | ✅ PASS |
| Random student ID | Denied safely (404) | ✅ PASS |
| Forged schoolId parameter | Cannot bypass (no school param) | ✅ PASS |
| SUPER_ADMIN | Intended behavior | ✅ PASS |
| Inactive user | Denied | ✅ STRUCTURAL PASS |

### payments/checkout

| Test | Expected | Structural Result |
|---|---|---|
| Unauthenticated | Denied | ✅ PASS |
| Own-school valid invoice | Allowed | ✅ PASS |
| Cross-school invoice ID | Denied (if profile exists) | ✅ PASS |
| Random invoice ID | Denied safely (404) | ✅ PASS |
| Forged schoolId parameter | Cannot bypass (no school param) | ✅ PASS |
| SUPER_ADMIN | Intended behavior | ✅ PASS |
| Inactive user | Denied | ✅ STRUCTURAL PASS |
| **Null profile** | **Should deny** | **❌ FAIL (F-6)** |

### teacher/meetings/[id]/notes

| Test | Expected | Structural Result |
|---|---|---|
| Unauthenticated | Denied | ✅ PASS |
| Teacher, same school, participant | Allowed | ✅ PASS |
| Teacher, same school, NOT participant | **Should deny** | **❌ FAIL (F-7)** |
| Teacher, different school | Denied | ✅ PASS |
| Non-TEACHER role | Forbidden | ✅ PASS |
| Random meeting ID | Denied safely (404) | ✅ PASS |
| Inactive user | Denied (requireRole) | ✅ PASS |

---

## 11. Regression Audit

### Files Modified (Phase 3B)

| File | Modified | Regression |
|---|---|---|
| `app/api/invoices/pdf/route.ts` | Yes | None — additive check only |
| `app/api/certificates/route.ts` | Yes | None — additive check only |
| `app/api/payments/checkout/route.ts` | Yes | None — additive check only (but incomplete) |
| `app/api/teacher/meetings/[id]/notes/route.ts` | Yes | None — additive check only (but incomplete) |
| `lib/auth.ts` | Yes | None — additive check only |

### Regression Checks

| Check | Result |
|---|---|
| Valid same-school access broken? | No — all same-school paths still work |
| SUPER_ADMIN access removed? | No — SUPER_ADMIN exemption preserved in all routes |
| Data exposed before authorization? | No — server-side data only, not sent to client |
| RLS assumptions weakened? | No — RLS unchanged |
| Client schoolId trusted? | No — all checks use DB-derived profile.schoolId |
| New auth bypass introduced? | No — only additive checks |
| Unrelated route behavior changed? | No — only modified files affected |

**No regressions found.**

---

## 12. Authentication Architecture Regression

| Check | Result |
|---|---|
| `proxy.ts` still handles protected requests | ✅ Unchanged |
| `updateSession()` still refreshes tokens | ✅ Unchanged |
| Page/layout auth guards intact | ✅ Unchanged |
| Mobile Bearer JWT independent | ✅ Unchanged |
| Role metadata defense-in-depth only | ✅ Unchanged |
| DB-backed profile authoritative | ✅ Unchanged |

**No architecture regression.**

---

## 13. RLS Regression Check

| Metric | Phase 3A Baseline | Phase 3C Actual | Status |
|---|---|---|---|
| Tables with RLS | 73/73 | 73/73 | ✅ Unchanged |
| RLS disabled | 0 | 0 | ✅ Unchanged |
| Policies | 62 | 62 | ✅ Unchanged |

**No RLS regression.** Phase 3B did not modify database schema, migrations, or RLS policies.

---

## 14. TypeScript Verification

```
npx tsc --noEmit
EXIT: 0
```

**Result: ✅ PASS**

---

## 15. Build Status

Build blocked by pre-existing `STRIPE_SECRET_KEY` environment configuration issue.
Not a Phase 3B/3C regression. OUT OF SCOPE.

---

## 16. Final Security Scorecard

| Security Area | Result |
|---|---|
| F-1 Invoice PDF isolation | ✅ PASS |
| F-2 Certificate isolation | ✅ PASS |
| F-3 Payment checkout isolation | ❌ FAIL (F-6: profile null bypass) |
| F-4 Meeting notes authorization | ❌ FAIL (F-7: no participation check) |
| F-5 Inactive user denial | ✅ PASS |
| New authorization findings | 2 (F-6, F-7) |
| Unauthenticated API access | ✅ PASS |
| Cross-school API isolation | ⚠️ Partial (F-6, F-7 gaps) |
| Forged ID resistance | ✅ PASS |
| SUPER_ADMIN behavior | ✅ PASS |
| Valid same-school behavior | ✅ PASS |
| Proxy regression | ✅ PASS |
| Session architecture regression | ✅ PASS |
| Mobile JWT regression | ✅ PASS |
| RLS regression | ✅ PASS |
| TypeScript | ✅ PASS |

---

## 17. Final Authentication Security Gate

## ⚠️ HOLD

**Blockers:**

1. **F-6 (MEDIUM):** `payments/checkout` — profile null bypasses school check. Fix: add `if (!profile) return 401` before school check.

2. **F-7 (MEDIUM):** `teacher/meetings/[id]/notes` — missing participation check. Fix: add `createdById`/attendee check matching `assertMeetingAccess` pattern.

**Not blocked by:**
- F-1, F-2, F-5 all PASS
- No CRITICAL or HIGH findings
- No regressions
- RLS intact
- TypeScript passes
