'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface PlanSummaryProps {
  planData: Term[];
  durationYears?: number;
  fulfilledRequirements: string[];
}

export function PlanSummary({ planData, durationYears, fulfilledRequirements }: PlanSummaryProps) {
  const totalCredits = planData.reduce((total, term) => {
    const termCredits =
      term.credits_planned ||
      (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
    return total + termCredits;
  }, 0);

  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 90%)',
        border: '1px solid #bbdefb',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center'
      }}
    >
      <Chip
        label={`${planData.length} term${planData.length === 1 ? '' : 's'} planned`}
        sx={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9', fontWeight: 'bold' }}
        size="small"
      />
      {Boolean(durationYears) && (
        <Chip
          label={`${durationYears} year${durationYears === 1 ? '' : 's'}`}
          size="small"
          sx={{ backgroundColor: '#ede7f6', border: '1px solid #b39ddb', fontWeight: 'bold' }}
        />
      )}
      <Chip
        label={`Total Credits: ${totalCredits}`}
        size="small"
        color="primary"
        sx={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32', fontWeight: 'bold' }}
      />
      {fulfilledRequirements.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography
            variant="body2"
            className="font-body"
            sx={{ fontWeight: 'bold', mr: 0.5, color: '#1565c0' }}
          >
            Requirements:
          </Typography>
          {fulfilledRequirements.map((req) => (
            <Chip
              key={req}
              label={req}
              size="small"
              sx={{
                backgroundColor: '#fffde7',
                border: '1px solid #fff59d',
                fontSize: '0.65rem',
                height: 22,
                fontWeight: 500
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
