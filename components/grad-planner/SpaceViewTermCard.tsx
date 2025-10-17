import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

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

interface SpaceViewTermCardProps {
  term: Term;
  index: number;
  events?: Event[];
  isEditMode?: boolean;
  onEditEvent?: (event?: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function SpaceViewTermCard({ term, index }: SpaceViewTermCardProps) {
  const termCredits = term.credits_planned ||
    (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid var(--border)',
        borderRadius: 2,
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        minHeight: '150px',
        height: '100%',
        width: '100%',
      }}
    >
      <Typography variant="subtitle2" className="font-header-bold" sx={{ color: 'var(--primary)', fontWeight: 700, mb: 1, fontSize: '0.9rem' }}>
        Term {term.term || index + 1}
      </Typography>
      <Typography variant="caption" className="font-body" sx={{ color: 'var(--primary)', fontWeight: 600, display: 'block', mb: 1.5 }}>
        {termCredits} Credits
      </Typography>

      {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {term.courses.map((course: Course, courseIndex: number) => {
            if (!course.code || !course.title) return null;
            return (
              <Typography
                key={`space-term-${index}-course-${courseIndex}`}
                variant="caption"
                className="font-body"
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  lineHeight: 1.4
                }}
              >
                {course.code}
              </Typography>
            );
          })}
        </Box>
      ) : (
        <Typography variant="caption" className="font-body" color="text.secondary">
          No courses
        </Typography>
      )}
    </Box>
  );
}
