import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/setup-password"]

const roleRouteMap: Record<string, string[]> = {
  "/dashboard/schools": ["SUPER_ADMIN"],
  "/dashboard/branches": ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/users": ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/sessions": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/classes": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PRINCIPAL"],
  "/dashboard/subjects": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PRINCIPAL"],
  "/dashboard/teachers": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/students": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ADMISSION_OFFICER", "TEACHER"],
  "/dashboard/staff": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/attendance": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/exams": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/fees": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"],
  "/dashboard/expenses": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"],
  "/dashboard/timetable": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/announcements": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/homework": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/library": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "LIBRARIAN"],
  "/dashboard/transport": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TRANSPORT_MANAGER"],
  "/dashboard/reports": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/notifications": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT", "PARENT"],
  "/dashboard/settings": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
}

const portalAllowedRoles = ["STUDENT", "PARENT", "TEACHER"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isPublicRoute || pathname === "/") {
    return await updateSession(request)
  }

  const { createServerClient } = await import("@supabase/ssr")
  const { NextResponse } = await import("next/server")

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return Response.redirect(url)
  }

  const { prisma } = await import("@/lib/prisma")
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, schoolId: true, branchId: true },
  })

  if (profile) {
    if (pathname.startsWith("/portal") && !portalAllowedRoles.includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return Response.redirect(url)
    }

    for (const [route, allowedRoles] of Object.entries(roleRouteMap)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(profile.role)) {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return Response.redirect(url)
      }
    }

    supabaseResponse.headers.set("X-User-Id", user.id)
    supabaseResponse.headers.set("X-User-Role", profile.role)
    supabaseResponse.headers.set("X-User-SchoolId", profile.schoolId || "")
    supabaseResponse.headers.set("X-User-BranchId", profile.branchId || "")
    supabaseResponse.headers.set("X-User-Email", user.email || "")
  }

  supabaseResponse.headers.set("X-Frame-Options", "DENY")
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block")

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}