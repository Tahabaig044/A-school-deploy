import { getParentChildren, getChildResults } from '@/actions/parent-portal.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, CheckCircle, XCircle, Award, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const gradeLabels: Record<string, string> = {
  A_PLUS: 'A+',
  A: 'A',
  B_PLUS: 'B+',
  B: 'B',
  C_PLUS: 'C+',
  C: 'C',
  D: 'D',
  F: 'F',
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function ParentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: studentId } = await searchParams;
  const children = await getParentChildren();

  if (!studentId) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Exam Results</h1>
        <p className="text-muted-foreground mb-4">Select a child to view their exam results.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/portal/parent/results?student=${child.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{child.firstName} {child.lastName}</p>
                      <p className="text-sm text-muted-foreground">View results</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const results = await getChildResults(studentId);
  const selectedChild = children.find((c) => c.id === studentId);

  const totalResults = results.length;
  const passedResults = results.filter((r) => {
    const marks = Number(r.marksObtained);
    return marks >= Number(r.exam.passingMarks);
  }).length;
  const failedResults = totalResults - passedResults;
  const passRate = totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0;

  const averagePercentage =
    totalResults > 0
      ? Math.round(
          results.reduce((sum, r) => {
            const marks = Number(r.marksObtained);
            const total = Number(r.exam.totalMarks);
            return sum + (total > 0 ? (marks / total) * 100 : 0);
          }, 0) / totalResults
        )
      : 0;

  const groupedByType: Record<string, typeof results> = {};
  for (const result of results) {
    const typeName = result.exam.examType.name;
    if (!groupedByType[typeName]) groupedByType[typeName] = [];
    groupedByType[typeName].push(result);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/parent/results">
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {selectedChild
            ? `${selectedChild.firstName} ${selectedChild.lastName}'s Results`
            : 'Results'}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalResults}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{passRate}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{passedResults}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{averagePercentage}%</span>
          </CardContent>
        </Card>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">No exam results found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByType).map(([typeName, typeResults]) => (
            <Card key={typeName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {typeName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {typeResults.map((result) => {
                    const marks = Number(result.marksObtained);
                    const total = Number(result.exam.totalMarks);
                    const passing = Number(result.exam.passingMarks);
                    const passed = marks >= passing;
                    const percentage = total > 0 ? Math.round((marks / total) * 100) : 0;

                    return (
                      <div
                        key={result.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{result.exam.name}</p>
                            <Badge variant="secondary">{result.exam.subject.name}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.exam.examDate ? formatDate(result.exam.examDate) : "No date"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Marks</p>
                            <p className="font-semibold">
                              {marks} / {total}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Grade</p>
                            <Badge
                              variant={passed ? 'success' : 'destructive'}
                            >
                              {result.grade ? gradeLabels[result.grade] || result.grade : "N/A"}
                            </Badge>
                          </div>
                          <div>
                            {passed ? (
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
