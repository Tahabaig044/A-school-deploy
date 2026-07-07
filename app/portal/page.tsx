import { redirect } from "next/navigation"
import { headers } from "next/headers"

export default async function PortalPage() {
  const headerStore = await headers()
  const userRole = headerStore.get("X-User-Role")

  if (!userRole) {
    redirect("/login")
  }

  switch (userRole) {
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
