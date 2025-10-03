'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface PlanAssumptionsProps {
  assumptions: string[];
}

export function PlanAssumptions({ assumptions }: PlanAssumptionsProps) {
  if (!assumptions || assumptions.length === 0) return null;

  return (
    <Box sx={{ mb: 3, p: 2, backgroundColor: 'var(--primary-15)', borderRadius: 3, border: '1px solid var(--primary)' }}>
      <Typography variant="h6" className="font-header-bold" gutterBottom>
        Plan Assumptions:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {assumptions.map((assumption) => (
          <Typography key={assumption} component="li" variant="body2" className="font-body">
            {assumption}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
