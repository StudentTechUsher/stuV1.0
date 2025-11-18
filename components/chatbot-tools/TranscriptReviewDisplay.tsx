'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, BookOpen, Award, Calendar, User, Hash } from 'lucide-react';

interface ParsedCourse {
  courseCode: string;
  title: string;
  credits: number;
  grade: string | null;
  term?: string | null;
  section?: string | null;
  professor?: string | null;
}

interface TranscriptReviewDisplayProps {
  courses: ParsedCourse[];
  onConfirm: () => void;
}

export default function TranscriptReviewDisplay({
  courses,
  onConfirm,
}: Readonly<TranscriptReviewDisplayProps>) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Group courses by term
  const coursesByTerm = useMemo(() => {
    const grouped: Record<string, ParsedCourse[]> = {};

    courses.forEach(course => {
      const term = course.term || 'Unknown Term';
      if (!grouped[term]) {
        grouped[term] = [];
      }
      grouped[term].push(course);
    });

    return grouped;
  }, [courses]);

  // Sort terms chronologically (basic sorting)
  const sortedTerms = useMemo(() => {
    return Object.keys(coursesByTerm).sort((a, b) => {
      // Put "Unknown Term" at the end
      if (a === 'Unknown Term') return 1;
      if (b === 'Unknown Term') return -1;
      // Simple alphabetical sort (can be improved with proper date parsing)
      return a.localeCompare(b);
    });
  }, [coursesByTerm]);

  const totalCredits = useMemo(() => {
    return courses.reduce((sum, course) => sum + course.credits, 0);
  }, [courses]);

  const handleConfirm = () => {
    setIsConfirmed(true);
    onConfirm();
  };

  // Get grade color
  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'text-gray-400';
    const upperGrade = grade.toUpperCase();
    if (upperGrade.startsWith('A')) return 'text-green-600 font-semibold';
    if (upperGrade.startsWith('B')) return 'text-blue-600 font-semibold';
    if (upperGrade.startsWith('C')) return 'text-yellow-600 font-semibold';
    if (upperGrade === 'P' || upperGrade === 'PASS') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen size={20} className="text-[var(--primary)]" />
          Transcript Review
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          I've extracted {courses.length} courses from your transcript. Review the information below and confirm to include it in your graduation plan.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Total Courses</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{courses.length}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{totalCredits.toFixed(1)}</p>
        </div>
      </div>

      {/* Courses by Term */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto">
        {sortedTerms.map((term) => {
          const termCourses = coursesByTerm[term];
          const termCredits = termCourses.reduce((sum, c) => sum + c.credits, 0);

          return (
            <div key={term} className="border rounded-lg overflow-hidden">
              {/* Term Header */}
              <div className="bg-[var(--primary)]/10 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--primary)]" />
                  <h4 className="font-semibold text-sm">{term}</h4>
                </div>
                <div className="text-xs text-muted-foreground">
                  {termCourses.length} courses • {termCredits.toFixed(1)} credits
                </div>
              </div>

              {/* Courses */}
              <div className="divide-y">
                {termCourses.map((course, idx) => (
                  <div key={`${course.courseCode}-${idx}`} className="p-4 hover:bg-muted/50 transition-colors">
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-sm">
                            {course.courseCode}
                          </span>
                          {course.section && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Hash size={12} />
                              {course.section}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{course.title}</p>
                      </div>

                      {/* Grade Badge */}
                      {course.grade && (
                        <div className={`px-3 py-1 rounded-full text-sm ${getGradeColor(course.grade)} bg-white border`}>
                          {course.grade}
                        </div>
                      )}
                    </div>

                    {/* Course Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Award size={14} />
                        <span>{course.credits.toFixed(1)} credits</span>
                      </div>
                      {course.professor && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>{course.professor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Message */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Ready to continue?</span> These courses will be incorporated into your graduation plan to ensure we don't recommend courses you've already completed.
        </p>
      </div>

      {/* Confirm Button */}
      <div className="mt-6">
        <Button
          onClick={handleConfirm}
          disabled={isConfirmed}
          className={`w-full gap-2 ${
            isConfirmed
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#0a1f1a] hover:bg-[#043322]'
          }`}
        >
          {isConfirmed ? (
            <>
              <CheckCircle2 size={18} />
              Confirmed
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Confirm & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
