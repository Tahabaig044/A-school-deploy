import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "School Management System",
  description:
    "A comprehensive school management system for managing students, teachers, fees, attendance, exams, and more.",
  keywords: ["school", "management", "students", "teachers", "fees", "attendance", "exams"],
  authors: [{ name: "School Management Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "School Management System",
    title: "School Management System",
    description:
      "A comprehensive school management system for managing students, teachers, fees, attendance, exams, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "School Management System",
    description:
      "A comprehensive school management system for managing students, teachers, fees, attendance, exams, and more.",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
