import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  if (!profile) {
    redirect("/login")
  }

  // Redirect to role-specific portal
  switch (profile.role) {
    case "STUDENT":
      redirect("/portal/student")
    case "PARENT":
      redirect("/portal/parent")
    case "TEACHER":
      redirect("/portal/teacher")
    default:
      redirect("/dashboard")
  }
}
