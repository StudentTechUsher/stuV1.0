'use client';

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ArrowForward, InfoOutlined } from '@mui/icons-material';

interface MovedCourse {
  courseName: string;
  courseCode: string;
  fromTerm: number;
  toTerm: number;
}

interface ChangesSummaryBoxProps {
  movedCourses: MovedCourse[];
  hasSuggestions: boolean;
}

export default function ChangesSummaryBox({ movedCourses, hasSuggestions }: ChangesSummaryBoxProps) {
  if (movedCourses.length === 0 && !hasSuggestions) {
    return null;
  }

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: '#f0f9ff',
        borderRadius: 2,
        border: '2px solid #3b82f6',
        position: 'sticky',
        top: 20,
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <InfoOutlined sx={{ color: '#3b82f6' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e40af' }}>
          Recent Changes
        </Typography>
      </Box>

      {movedCourses.length > 0 && (
        <Box sx={{ mb: hasSuggestions ? 2 : 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#334155' }}>
            Courses Moved:
          </Typography>
          {movedCourses.map((course, index) => (
            <Box
              key={index}
              sx={{
                mb: 1.5,
                p: 2,
                backgroundColor: 'white',
                borderRadius: 1,
                border: '1px solid #e0e7ff'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#1e293b' }}>
                {course.courseCode || course.courseName}
              </Typography>
              {course.courseCode && course.courseName && course.courseCode !== course.courseName && (
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#64748b' }}>
                  {course.courseName}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`Term ${course.fromTerm}`}
                  size="small"
                  sx={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
                <ArrowForward sx={{ fontSize: 16, color: '#64748b' }} />
                <Chip
                  label={`Term ${course.toTerm}`}
                  size="small"
                  sx={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {hasSuggestions && (
        <Box
          sx={{
            p: 2,
            backgroundColor: '#fff7ed',
            borderRadius: 1,
            border: '1px solid #fb923c'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#9a3412' }}>
            💡 Your advisor added suggestions
          </Typography>
          <Typography variant="caption" sx={{ color: '#7c2d12', display: 'block', mt: 0.5 }}>
            Check the advisor notes section for details
          </Typography>
        </Box>
      )}
    </Box>
  );
}
