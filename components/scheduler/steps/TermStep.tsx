'use client';

import { Box, Button, Typography } from '@mui/material';
import TermSelector from '../TermSelector';

interface TermStepProps {
  terms: Array<{
    term: string;
    notes?: string;
    courses?: unknown[];
    credits_planned?: number;
    is_active?: boolean;
    termPassed?: boolean;
  }>;
  selectedTermIndex: number | null;
  selectedTermName: string | null;
  onTermSelect: (termName: string, index: number) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export default function TermStep({
  terms,
  selectedTermIndex,
  selectedTermName,
  onTermSelect,
  onNext,
  isLoading = false,
}: TermStepProps) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
        Select Term
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose which term you'd like to schedule courses for.
      </Typography>

      <TermSelector
        terms={terms}
        selectedTermIndex={selectedTermIndex}
        selectedYear={null}
        onTermSelect={onTermSelect}
        isLoading={isLoading}
      />

      {selectedTermName && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={onNext}
            disabled={isLoading}
          >
            Continue to Personal Events
          </Button>
        </Box>
      )}
    </Box>
  );
}
