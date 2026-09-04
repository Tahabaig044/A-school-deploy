"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"
import { deleteQuestion } from "@/actions/question-bank.actions"
import { useToast } from "@/hooks/use-toast"

interface Question {
  id: string
  question: string
  questionType: string
  marks: number
  difficulty: string
  subject: { name: string }
  class: { name: string }
}

export function QuestionBankList({ questions }: { questions: Question[] }) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return
    const result = await deleteQuestion(id)
    if (result?.error) {
      toast({ title: result.error, variant: "destructive" })
    } else {
      toast({ title: "Question deleted" })
      router.refresh()
    }
  }

  function getDifficultyVariant(d: string) {
    switch (d) {
      case "EASY": return "default" as const
      case "MEDIUM": return "secondary" as const
      case "HARD": return "destructive" as const
      default: return "secondary" as const
    }
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">
          No questions in the bank yet. Add your first question to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium line-clamp-2">{q.question}</TableCell>
                <TableCell>{q.subject.name}</TableCell>
                <TableCell>{q.class.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{q.questionType.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell>{q.marks}</TableCell>
                <TableCell>
                  <Badge variant={getDifficultyVariant(q.difficulty)}>{q.difficulty}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
