'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DraggableCourse } from './DraggableCourse';
import { DroppableTerm } from './DroppableTerm';

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface TermCardProps {
  term: Term;
  termIndex: number;
  isEditMode: boolean;
  currentPlanData: Term[];
  modifiedTerms: Set<number>;
  movedCourses: Set<string>;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
}

export function TermCard({
  term,
  termIndex,
  isEditMode,
  currentPlanData,
  modifiedTerms,
  movedCourses,
  onMoveCourse,
}: TermCardProps) {
  const termCredits = term.credits_planned ||
    (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);

  return (
    <DroppableTerm
      term={term}
      termIndex={termIndex}
      isEditMode={isEditMode}
      modifiedTerms={modifiedTerms}
    >
      <Box
        sx={{
          p: 3,
          border: '2px solid var(--border)',
          borderRadius: 2,
          backgroundColor: 'var(--muted)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          minHeight: '200px',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" className="font-header-bold" sx={{ color: 'var(--primary)', fontWeight: 800 }}>
            Term {term.term || termIndex + 1}
          </Typography>
          <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
            {termCredits} Credits
          </Typography>
        </Box>

        {term.notes && (
          <Box sx={{ mb: 2, p: 1, backgroundColor: 'var(--primary-15)', borderRadius: 2 }}>
            <Typography variant="body2" className="font-body" color="text.secondary">
              {term.notes}
            </Typography>
          </Box>
        )}

        {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
          <Box>
            <Typography variant="subtitle1" className="font-header-bold" gutterBottom sx={{ fontWeight: 700 }}>
              Courses ({term.courses.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {term.courses.map((course: Course, courseIndex: number) => {
                if (!course.code || !course.title) {
                  console.warn(`⚠️ Skipping invalid course in term ${termIndex + 1}:`, course);
                  return null;
                }

                return (
                  <DraggableCourse
                    key={`term-${termIndex}-course-${courseIndex}-${course.code}-${course.title?.substring(0, 10)}`}
                    course={course}
                    courseIndex={courseIndex}
                    termIndex={termIndex}
                    isEditMode={isEditMode}
                    currentPlanData={currentPlanData}
                    onMoveCourse={onMoveCourse}
                    movedCourses={movedCourses}
                  />
                );
              }).filter(Boolean)}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" className="font-body" color="text.secondary">
            No courses defined for this term
          </Typography>
        )}
      </Box>
    </DroppableTerm>
  );
}
