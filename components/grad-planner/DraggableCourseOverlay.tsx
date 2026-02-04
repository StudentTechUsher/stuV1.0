import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface Course {
  code: string;
  title: string | null;
  credits: number;
  fulfills?: string[];
}

interface DraggableCourseOverlayProps {
  course: Course;
}

export function DraggableCourseOverlay({ course }: DraggableCourseOverlayProps) {
  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: 'white',
        borderRadius: 2,
        border: '2px solid var(--primary)',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: 0.9,
        transform: 'rotate(5deg)',
        boxShadow: '0 8px 32px rgba(18, 249, 135, 0.3)',
      }}
    >
      <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', mb: 1 }}>
        {course.code}: {course.title}
      </Typography>
      <Typography variant="caption" className="font-body" color="text.secondary">
        {course.credits} credits
      </Typography>
    </Box>
  );
}
