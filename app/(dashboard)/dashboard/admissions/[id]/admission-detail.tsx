"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  reviewAdmission,
  approveAndEnroll,
  addGuardian,
  deleteGuardian,
  uploadAdmissionDocument,
  deleteAdmissionDocument,
} from "@/actions/admission.actions"
import { approveAndEnrollStudent } from "@/actions/student.actions"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Check, X, Clock, FileText, Users, Upload, Trash2 } from "lucide-react"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WAITLISTED: "bg-purple-100 text-purple-800",
}

interface AdmissionDetailProps {
  admission: any
}

export function AdmissionDetail({ admission }: AdmissionDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  async function handleReview(action: "APPROVED" | "REJECTED" | "WAITLISTED") {
    setLoading(true)
    try {
      const result = await reviewAdmission(
        admission.id,
        action,
        action === "REJECTED" ? rejectionReason : undefined,
      )
      if (result.success) {
        toast({ title: `Admission ${action.toLowerCase()}` })
        router.refresh()
      } else {
        toast({ title: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveAndEnroll() {
    setLoading(true)
    try {
      const result = await approveAndEnrollStudent(admission.id)
      if (result.success) {
        toast({ title: "Student enrolled successfully" })
        if (result.invitationLink) {
          toast({ title: "Invitation link generated. Share with student." })
        }
        router.refresh()
      } else {
        toast({ title: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddGuardian(formData: FormData) {
    setLoading(true)
    try {
      const result = await addGuardian(admission.id, null, formData)
      if (result.success) {
        toast({ title: "Guardian added successfully" })
        router.refresh()
      } else {
        toast({ title: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteGuardian(guardianId: string) {
    try {
      await deleteGuardian(guardianId, admission.id)
      toast({ title: "Guardian removed" })
      router.refresh()
    } catch {
      toast({ title: "Failed to remove guardian", variant: "destructive" })
    }
  }

  async function handleUploadDocument(formData: FormData) {
    setLoading(true)
    try {
      const documentType = formData.get("documentType") as string
      const documentName = formData.get("documentName") as string
      const file = formData.get("file") as File

      if (!file || !documentType || !documentName) {
        toast({ title: "Please fill all fields", variant: "destructive" })
        return
      }

      const filePath = `admissions/${admission.id}/${Date.now()}-${file.name}`

      const result = await uploadAdmissionDocument(
        admission.id,
        documentType,
        documentName,
        filePath,
        file.size,
      )

      if (result.success) {
        toast({ title: "Document uploaded successfully" })
        router.refresh()
      } else {
        toast({ title: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      await deleteAdmissionDocument(documentId, admission.id)
      toast({ title: "Document deleted" })
      router.refresh()
    } catch {
      toast({ title: "Failed to delete document", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {admission.firstName} {admission.lastName}
            </h1>
            <p className="text-muted-foreground">
              {admission.admissionNo} | Applied {new Date(admission.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge className={statusColors[admission.status]}>
          {admission.status.replace("_", " ")}
        </Badge>
      </div>

      {admission.status === "PENDING" || admission.status === "UNDER_REVIEW" ? (
        <Card>
          <CardHeader>
            <CardTitle>Review Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" className="bg-green-600 hover:bg-green-700">
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Admission</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will approve the admission. You can then enroll the student.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleReview("APPROVED")} disabled={loading}>
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Admission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please provide a reason for rejection.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleReview("REJECTED")} disabled={loading}>
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                onClick={() => handleReview("WAITLISTED")}
                disabled={loading}
              >
                <Clock className="mr-2 h-4 w-4" />
                Waitlist
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : admission.status === "APPROVED" && !admission.studentId ? (
        <Card>
          <CardHeader>
            <CardTitle>Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This admission has been approved. You can now enroll the student.
            </p>
            <Button onClick={handleApproveAndEnroll} disabled={loading}>
              Approve & Enroll Student
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="guardians">
            <Users className="mr-2 h-4 w-4" />
            Guardians ({admission.guardians?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents ({admission.documents?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name</span>
                  <span>
                    {admission.firstName} {admission.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span>
                    {admission.dateOfBirth
                      ? new Date(admission.dateOfBirth).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender</span>
                  <span>{admission.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Group</span>
                  <span>{admission.bloodGroup || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Religion</span>
                  <span>{admission.religion || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nationality</span>
                  <span>{admission.nationality || "-"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{admission.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{admission.email || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span>{admission.address || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City</span>
                  <span>{admission.city || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State</span>
                  <span>{admission.state || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postal Code</span>
                  <span>{admission.postalCode || "-"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admission Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admission No</span>
                  <span className="font-mono">{admission.appliedClass?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied Class</span>
                  <span>{admission.appliedClass?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Academic Session</span>
                  <span>{admission.academicSession?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous School</span>
                  <span>{admission.previousSchool || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Class</span>
                  <span>{admission.previousClass || "-"}</span>
                </div>
                {admission.reason && (
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground">Reason</span>
                    <p className="mt-1">{admission.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {admission.reviewedBy && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed By</span>
                    <span>
                      {admission.reviewedBy.firstName} {admission.reviewedBy.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed At</span>
                    <span>
                      {admission.reviewedAt ? new Date(admission.reviewedAt).toLocaleString() : "-"}
                    </span>
                  </div>
                  {admission.rejectionReason && (
                    <div className="border-t pt-2">
                      <span className="text-muted-foreground">Rejection Reason</span>
                      <p className="mt-1 text-red-600">{admission.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="guardians" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guardians</CardTitle>
            </CardHeader>
            <CardContent>
              {admission.guardians?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admission.guardians.map((guardian: any) => (
                      <TableRow key={guardian.id}>
                        <TableCell className="font-medium">
                          {guardian.firstName} {guardian.lastName}
                        </TableCell>
                        <TableCell>{guardian.relationship}</TableCell>
                        <TableCell>{guardian.phone || "-"}</TableCell>
                        <TableCell>{guardian.email || "-"}</TableCell>
                        <TableCell>{guardian.isPrimary ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGuardian(guardian.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No guardians added yet.</p>
              )}

              <div className="mt-6 border-t pt-6">
                <h4 className="mb-4 font-medium">Add Guardian</h4>
                <form action={handleAddGuardian} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <Select name="relationship" defaultValue="FATHER">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FATHER">Father</SelectItem>
                        <SelectItem value="MOTHER">Mother</SelectItem>
                        <SelectItem value="GUARDIAN">Guardian</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input id="occupation" name="occupation" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isPrimary">Primary Guardian</Label>
                    <Select name="isPrimary" defaultValue="false">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      Add Guardian
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {admission.documents?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admission.documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.documentType}</TableCell>
                        <TableCell className="font-medium">{doc.documentName}</TableCell>
                        <TableCell>
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "-"}
                        </TableCell>
                        <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No documents uploaded yet.</p>
              )}

              <div className="mt-6 border-t pt-6">
                <h4 className="mb-4 font-medium">Upload Document</h4>
                <form action={handleUploadDocument} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type *</Label>
                    <Select name="documentType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Birth Certificate">Birth Certificate</SelectItem>
                        <SelectItem value="ID Proof">ID Proof</SelectItem>
                        <SelectItem value="Address Proof">Address Proof</SelectItem>
                        <SelectItem value="Previous School Report">
                          Previous School Report
                        </SelectItem>
                        <SelectItem value="Transfer Certificate">Transfer Certificate</SelectItem>
                        <SelectItem value="Medical Record">Medical Record</SelectItem>
                        <SelectItem value="Photo">Photo</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentName">Document Name *</Label>
                    <Input id="documentName" name="documentName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">File *</Label>
                    <Input id="file" name="file" type="file" required />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={loading}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
