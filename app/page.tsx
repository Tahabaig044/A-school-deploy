import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
    <div className="flex flex-col min-h-full">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
        <section className="py-24 text-center px-4">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            School Management System
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A comprehensive multi-branch school management platform for
            administrators, teachers, students, and parents.
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

        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-center mb-12">
              Everything you need to run your school
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} SchoolMS. All rights reserved.
      </footer>
    </div>
  )
}
