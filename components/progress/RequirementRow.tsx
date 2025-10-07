'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  LinearProgress,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import type { Requirement, ProgressCategory } from '@/types/program-progress';
import { getCategoryColor, getStatusBadgeText, formatProgressFraction } from '@/lib/utils/progress';
import SubrequirementList from './SubrequirementList';

interface RequirementRowProps {
  requirement: Requirement;
  category: ProgressCategory;
  isAdvisor?: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export default function RequirementRow({
  requirement,
  category,
  isAdvisor = false,
  expanded,
  onToggle,
}: RequirementRowProps) {
  const categoryColor = getCategoryColor(category);
  const statusText = getStatusBadgeText(requirement.status);

  const getStatusColor = () => {
    switch (requirement.status) {
      case 'SATISFIED':
        return 'var(--primary)';
      case 'PARTIAL':
        return 'var(--action-info)';
      case 'WAIVED':
        return 'var(--muted-foreground)';
      case 'SUBSTITUTED':
        return 'var(--accent)';
      default:
        return 'var(--muted-foreground)';
    }
  };

  const hasSubs = requirement.subrequirements && requirement.subrequirements.length > 0;

  // Get background color based on status
  const getBackgroundColor = () => {
    switch (requirement.status) {
      case 'SATISFIED':
        return 'var(--primary-tint)';
      case 'PARTIAL':
        return 'rgba(25, 118, 210, 0.04)';
      case 'WAIVED':
        return 'var(--muted)';
      case 'SUBSTITUTED':
        return 'rgba(25, 118, 210, 0.06)';
      default:
        return 'var(--background)';
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      sx={{
        mb: 0.75,
        border: '1px solid var(--border)',
        borderRadius: '6px !important',
        backgroundColor: getBackgroundColor(),
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 6px 0',
        },
      }}
    >
      <AccordionSummary
        expandIcon={hasSubs ? <ExpandMore sx={{ color: categoryColor, fontSize: 20 }} /> : null}
        sx={{
          minHeight: '44px',
          px: 1.5,
          py: 0.5,
          '&.Mui-expanded': {
            minHeight: '44px',
            borderBottom: hasSubs ? '1px solid var(--border)' : 'none',
          },
          '& .MuiAccordionSummary-content': {
            margin: '8px 0',
            alignItems: 'center',
          },
          '&:hover': {
            backgroundColor: requirement.status === 'SATISFIED'
              ? 'var(--primary-15)'
              : requirement.status === 'PARTIAL'
                ? 'rgba(25, 118, 210, 0.08)'
                : 'var(--muted)',
          },
          cursor: hasSubs ? 'pointer' : 'default',
          pointerEvents: hasSubs ? 'auto' : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {/* Index Badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: `${categoryColor}15`,
              color: categoryColor,
              fontWeight: 700,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            {requirement.index}
          </Box>

          {/* Title and Subtitle */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              className="font-body-semi"
              sx={{
                fontSize: '0.8rem',
                color: 'var(--foreground)',
                lineHeight: 1.3,
              }}
            >
              {requirement.title}
            </Typography>
            {requirement.subtitle && (
              <Typography
                variant="caption"
                className="font-body"
                sx={{
                  fontSize: '0.68rem',
                  color: 'var(--muted-foreground)',
                  display: 'block',
                  mt: 0.1,
                  lineHeight: 1.2,
                }}
              >
                {requirement.subtitle}
              </Typography>
            )}
          </Box>

          {/* Progress Fraction */}
          {requirement.fraction && (
            <Typography
              variant="body2"
              className="font-mono"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--foreground)',
                minWidth: '50px',
                textAlign: 'right',
              }}
            >
              {formatProgressFraction(requirement.fraction.num, requirement.fraction.den, requirement.fraction.unit)}
              <Typography
                component="span"
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  color: 'var(--muted-foreground)',
                  ml: 0.5,
                }}
              >
                {requirement.fraction.unit === 'courses' ? 'cr' : 'hrs'}
              </Typography>
            </Typography>
          )}

          {/* Status Badge */}
          <Chip
            label={statusText}
            size="small"
            sx={{
              backgroundColor: `${getStatusColor()}15`,
              color: getStatusColor(),
              fontWeight: 600,
              fontSize: '0.65rem',
              height: '20px',
              minWidth: '75px',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>
      </AccordionSummary>

      {hasSubs && (
        <AccordionDetails sx={{ p: 0 }}>
          {/* Progress Bar */}
          <Box sx={{ px: 1.5, pt: 1.5, pb: 0.75 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(requirement.progress * 100, 100)}
              sx={{
                height: 4,
                borderRadius: '2px',
                backgroundColor: 'var(--muted)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: categoryColor,
                  borderRadius: '2px',
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.25,
                textAlign: 'right',
                color: categoryColor,
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              {Math.round(requirement.progress * 100)}%
            </Typography>
          </Box>

          {/* Subrequirements */}
          <SubrequirementList
            subrequirements={requirement.subrequirements || []}
            category={category}
            isAdvisor={isAdvisor}
          />
        </AccordionDetails>
      )}
    </Accordion>
  );
}
