/**
 * Credit Summary Display Component
 *
 * Shows total credits selected, distribution strategy, and term-by-term suggestions
 */

import React from 'react';
import { Box, Typography, Chip, Divider } from '@mui/material';
import { SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

interface CreditSummaryDisplayProps {
  totalCredits: number;
  strategy?: 'fast_track' | 'balanced' | 'explore';
  distribution?: SemesterAllocation[];
  estimatedCompletion?: string; // e.g., "Fall 2026"
}

const strategyLabels: Record<string, string> = {
  fast_track: 'Fast Track',
  balanced: 'Balanced',
  explore: 'Explore',
};

const strategyDescriptions: Record<string, string> = {
  fast_track: '15-18 credits per semester, 6-9 per term',
  balanced: '12-18 credits per semester (variable)',
  explore: '12-15 credits per semester (min loads)',
};

export function CreditSummaryDisplay({
  totalCredits,
  strategy,
  distribution,
  estimatedCompletion,
}: CreditSummaryDisplayProps) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        p: 3,
        bgcolor: 'background.paper',
      }}
    >
      {/* Total Credits Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          Total Credits to Complete
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {totalCredits} credits
        </Typography>
      </Box>

      {/* Strategy (if selected) */}
      {strategy && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Distribution Strategy
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={strategyLabels[strategy]}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {strategyDescriptions[strategy]}
            </Typography>
          </Box>
        </>
      )}

      {/* Estimated Completion */}
      {estimatedCompletion && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: distribution ? 2 : 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>
              Estimated Completion
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {estimatedCompletion}
            </Typography>
            {distribution && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {distribution.length} term{distribution.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Term-by-Term Breakdown */}
      {distribution && distribution.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              Suggested Distribution
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {distribution.map((allocation, index) => (
                <Box
                  key={`${allocation.term}-${allocation.year}-${index}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    px: 1.5,
                    borderRadius: 1,
                    bgcolor: allocation.termType === 'primary' ? 'action.hover' : 'background.default',
                    border: '1px solid',
                    borderColor: allocation.termType === 'primary' ? 'divider' : 'transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {allocation.term} {allocation.year}
                    </Typography>
                    {allocation.termType === 'secondary' && (
                      <Chip
                        label="Optional"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: 'action.selected',
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {allocation.suggestedCredits} credits
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {allocation.minCredits}-{allocation.maxCredits} range
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export default CreditSummaryDisplay;
