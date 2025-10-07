'use client';

import * as React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import type { ProgressCategory } from '@/types/program-progress';
import { getCategoryColor, getCategoryTint, calculatePlannedProgress } from '@/lib/utils/progress';

interface CategoryHeaderProps {
  category: ProgressCategory;
  label: string;
  requiredHours?: number;
  overallPercent: number;
  kpis?: {
    completed: number;
    inProgress: number;
    planned: number;
    remaining: number;
  };
}

export default function CategoryHeader({
  category,
  label,
  requiredHours,
  overallPercent,
  kpis
}: CategoryHeaderProps) {
  const categoryColor = getCategoryColor(category);
  const categoryTint = getCategoryTint(category);

  // Calculate planned progress
  const plannedPercent = kpis && requiredHours
    ? calculatePlannedProgress(
        kpis.completed,
        kpis.inProgress,
        kpis.planned,
        requiredHours
      )
    : overallPercent;

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 1.5,
        backgroundColor: categoryTint,
        border: '1px solid var(--border)',
        borderRadius: '6px',
      }}
    >
      {/* Title and Required Hours */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography
          variant="h5"
          className="font-brand-bold"
          sx={{
            color: 'var(--foreground)',
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          {label}
        </Typography>
        {requiredHours !== undefined && (
          <Typography
            variant="caption"
            className="font-body-medium"
            sx={{
              color: 'var(--muted-foreground)',
              fontSize: '1rem',
            }}
          >
             <span className="font-bold text-[var(--foreground)]">
              {requiredHours}
             </span>{' '}
            hrs required
          </Typography>
        )}
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 0.5, position: 'relative' }}>
        {/* Planned progress layer (faded) */}
        <LinearProgress
          variant="determinate"
          value={Math.min(plannedPercent, 100)}
          sx={{
            height: 6,
            borderRadius: '3px',
            backgroundColor: 'var(--muted)',
            position: 'absolute',
            width: '100%',
            '& .MuiLinearProgress-bar': {
              backgroundColor: categoryColor,
              opacity: 0.35,
              borderRadius: '3px',
              transition: 'transform 0.4s ease-in-out',
            },
          }}
        />
        {/* Completed progress layer (solid) */}
        <LinearProgress
          variant="determinate"
          value={Math.min(overallPercent, 100)}
          sx={{
            height: 6,
            borderRadius: '3px',
            backgroundColor: 'transparent',
            position: 'relative',
            '& .MuiLinearProgress-bar': {
              backgroundColor: categoryColor,
              borderRadius: '3px',
              transition: 'transform 0.4s ease-in-out',
            },
          }}
        />
      </Box>

      {/* Percentage Text */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="caption"
          className="font-body-semi"
          sx={{
            color: categoryColor,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {overallPercent}% Complete
        </Typography>
        {overallPercent >= 100 && (
          <Typography
            variant="caption"
            sx={{
              color: 'var(--primary)',
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            ✓ Satisfied
          </Typography>
        )}
      </Box>
    </Box>
  );
}
