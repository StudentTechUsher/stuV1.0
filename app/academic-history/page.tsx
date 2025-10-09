/**
 * Academic History Page
 * Displays parsed courses from transcripts, grouped by term.
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Course {
  id: string;
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
  confidence: number;
  source_document: string;
  inserted_at: string;
}

interface GroupedCourses {
  [term: string]: Course[];
}

async function getAcademicHistory(): Promise<Course[]> {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user's courses
  const { data: courses, error } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', user.id)
    .order('inserted_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }

  return courses as Course[];
}

function groupCoursesByTerm(courses: Course[]): GroupedCourses {
  const grouped: GroupedCourses = {};

  for (const course of courses) {
    if (!grouped[course.term]) {
      grouped[course.term] = [];
    }
    grouped[course.term].push(course);
  }

  // Sort terms in reverse chronological order
  const sortedGrouped: GroupedCourses = {};
  const termOrder = ['Fall', 'Summer', 'Spring', 'Winter'];

  const sortedTerms = Object.keys(grouped).sort((a, b) => {
    const yearA = parseInt(a.match(/\d{4}/)?.[0] || '0');
    const yearB = parseInt(b.match(/\d{4}/)?.[0] || '0');

    if (yearA !== yearB) {
      return yearB - yearA; // Descending year
    }

    const termA = termOrder.indexOf(a.split(' ')[0]);
    const termB = termOrder.indexOf(b.split(' ')[0]);
    return termA - termB;
  });

  for (const term of sortedTerms) {
    sortedGrouped[term] = grouped[term];
  }

  return sortedGrouped;
}

function getGradeColor(grade: string | null): string {
  if (!grade) return 'bg-gray-200 text-gray-800';

  if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
  if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
  if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
  if (grade === 'F') return 'bg-red-100 text-red-800';
  if (['P', 'CR'].includes(grade)) return 'bg-green-100 text-green-800';

  return 'bg-gray-100 text-gray-800';
}

export default async function AcademicHistoryPage() {
  const courses = await getAcademicHistory();
  const groupedCourses = groupCoursesByTerm(courses);

  const totalCredits = courses.reduce((sum, course) => sum + (course.credits || 0), 0);
  const lowConfidenceCount = courses.filter(c => c.confidence < 0.7).length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Academic History</h1>
        <p className="text-muted-foreground">
          View all courses parsed from your transcripts
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {lowConfidenceCount}
              {lowConfidenceCount > 0 && (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses by Term */}
      {Object.keys(groupedCourses).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No courses found. Upload a transcript to get started.
            </p>
            <Button asChild>
              <a href="/students">Upload Transcript</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCourses).map(([term, termCourses]) => {
            const termCredits = termCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

            return (
              <Card key={term}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{term}</CardTitle>
                    <Badge variant="outline">
                      {termCredits.toFixed(1)} credits
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-center">Credits</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {termCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">
                            {course.subject} {course.number}
                          </TableCell>
                          <TableCell>{course.title}</TableCell>
                          <TableCell className="text-center">
                            {course.credits.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-center">
                            {course.grade ? (
                              <Badge
                                variant="secondary"
                                className={getGradeColor(course.grade)}
                              >
                                {course.grade}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                In Progress
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {course.confidence < 0.7 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {(course.confidence * 100).toFixed(0)}%
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {(course.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Low Confidence Warning */}
      {lowConfidenceCount > 0 && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">
                  Some courses need review
                </h3>
                <p className="text-sm text-orange-800">
                  {lowConfidenceCount} course{lowConfidenceCount > 1 ? 's have' : ' has'} low
                  confidence scores (&lt;70%). Please review these entries for accuracy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
