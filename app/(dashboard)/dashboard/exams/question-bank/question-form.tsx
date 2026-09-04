"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { createQuestion } from "@/actions/question-bank.actions"
import { useToast } from "@/hooks/use-toast"

export function QuestionForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createQuestion(null, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setError(null)
      toast({ title: "Question created successfully" })
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null) }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Question</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subjectId">Subject</Label>
              <Select name="subjectId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder">Select subject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="classId">Class</Label>
              <Select name="classId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder">Select class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="question">Question</Label>
            <Textarea id="question" name="question" required placeholder="Enter your question..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select name="questionType" defaultValue="MCQ" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">Multiple Choice</SelectItem>
                  <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                  <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                  <SelectItem value="LONG_ANSWER">Long Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select name="difficulty" defaultValue="MEDIUM" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="options">Options (JSON array, e.g. [&quot;A&quot;, &quot;B&quot;, &quot;C&quot;, &quot;D&quot;])</Label>
            <Input id="options" name="options" placeholder='["Option A", "Option B", "Option C", "Option D"]' />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="correctAnswer">Correct Answer</Label>
              <Input id="correctAnswer" name="correctAnswer" placeholder="e.g. Option A" />
            </div>
            <div>
              <Label htmlFor="marks">Marks</Label>
              <Input id="marks" name="marks" type="number" min="1" defaultValue="1" required />
            </div>
          </div>
          <div>
            <Label htmlFor="explanation">Explanation (optional)</Label>
            <Textarea id="explanation" name="explanation" placeholder="Explain the correct answer..." />
          </div>
          <Button type="submit" className="w-full">Add Question</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
