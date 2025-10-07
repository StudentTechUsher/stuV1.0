'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { CategoryProgress, ProgressCategory } from '@/types/program-progress';
import { getCategoryColor, calculatePlannedProgress } from '@/lib/utils/progress';

interface ProgressSummaryViewProps {
  categories: CategoryProgress[];
  onCategoryClick: (category: ProgressCategory) => void;
}

export default function ProgressSummaryView({
  categories,
  onCategoryClick,
}: ProgressSummaryViewProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant="h6"
        className="font-brand-bold"
        sx={{
          fontSize: '1.1rem',
          color: 'var(--foreground)',
          mb: 2,
        }}
      >
        Overall Progress
      </Typography>

      {categories.map((cat) => {
        const categoryColor = getCategoryColor(cat.category);

        // Calculate planned progress (completed + in-progress + planned)
        const plannedPercent = cat.requiredHours
          ? calculatePlannedProgress(
              cat.kpis.completed,
              cat.kpis.inProgress,
              cat.kpis.planned,
              cat.requiredHours
            )
          : cat.overallPercent;

        return (
          <Box
            key={cat.category}
            onClick={() => onCategoryClick(cat.category)}
            sx={{
              mb: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateX(4px)',
              },
            }}
          >
            {/* Category Label */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
              <Typography
                variant="body1"
                className="font-brand"
                sx={{
                  fontWeight: 700,
                  minWidth: '140px',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)',
                }}
              >
                {cat.label}
              </Typography>
            </Box>

            {/* Progress Bar */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '32px',
                borderRadius: '16px',
                backgroundColor: 'var(--background)',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: `0 4px 12px ${categoryColor}30`,
                  borderColor: categoryColor,
                },
              }}
            >
              {/* Planned portion (faded background layer) */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(plannedPercent, 100)}%`,
                  backgroundColor: categoryColor,
                  opacity: 0.35,
                  borderRadius: '16px',
                  transition: 'width 0.4s ease-in-out',
                }}
              />

              {/* Completed portion (solid color) */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${cat.overallPercent}%`,
                  backgroundColor: categoryColor,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'width 0.4s ease-in-out',
                }}
              >
                <Typography
                  variant="body2"
                  className="font-body-semi"
                  sx={{
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {cat.overallPercent}% complete
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
