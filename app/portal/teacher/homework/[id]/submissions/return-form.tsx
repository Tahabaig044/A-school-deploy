"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { returnHomeworkForResubmission } from "@/actions/teacher-portal.actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RotateCcw } from "lucide-react"

export function ReturnForm({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(returnHomeworkForResubmission, null)

  if (state?.success) {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-purple-600 border-purple-200">
          <RotateCcw className="h-3 w-3 mr-1" />
          Return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return for Resubmission</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="submissionId" value={submissionId} />
          <div className="space-y-2">
            <Label htmlFor="returnReason">Reason for return *</Label>
            <Input
              id="returnReason"
              name="returnReason"
              placeholder="e.g. Incorrect format, incomplete work..."
              required
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Returning..." : "Return for Resubmission"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
