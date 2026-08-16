import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"

export default async function PortalPage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

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
