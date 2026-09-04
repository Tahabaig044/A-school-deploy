import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    title: "Student Management",
    description: "Complete student lifecycle from admission to alumni tracking",
  },
  {
    title: "Attendance Tracking",
    description: "Daily attendance with bulk marking and reports",
  },
  {
    title: "Fee Management",
    description: "Automated invoicing, payments, and defaulter tracking",
  },
  {
    title: "Exams & Results",
    description: "Exam scheduling, marks entry, and report cards",
  },
  {
    title: "Timetable & Homework",
    description: "Class scheduling, homework assignments and submissions",
  },
  {
    title: "Library & Transport",
    description: "Book management and student transport routing",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">SchoolMS</h1>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 py-24 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">School Management System</h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
            A comprehensive multi-branch school management platform for administrators, teachers,
            students, and parents.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Login
              </Button>
            </Link>
          </div>
        </section>

        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <h3 className="mb-12 text-center text-2xl font-bold">
              Everything you need to run your school
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-sm">
        &copy; {new Date().getFullYear()} SchoolMS. All rights reserved.
      </footer>
    </div>
  )
}
