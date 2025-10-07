'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle, Schedule, Event, PendingActions } from '@mui/icons-material';

interface KpiCountersProps {
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
}

interface KpiChipProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
}

function KpiChip({ icon, label, value, color, backgroundColor }: KpiChipProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        p: 1,
        minWidth: '65px',
        borderRadius: '8px',
        backgroundColor,
        border: `1px solid ${color}20`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: `0 2px 8px ${color}15`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: `${color}15`,
          color,
        }}
      >
        <Box sx={{ fontSize: 16 }}>{icon}</Box>
      </Box>
      <Typography
        variant="h6"
        className="font-brand-bold"
        sx={{
          fontSize: '1.1rem',
          lineHeight: 1,
          color: 'var(--foreground)',
          mt: 0.25,
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        className="font-body"
        sx={{
          fontSize: '0.65rem',
          color: 'var(--muted-foreground)',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default function KpiCounters({
  completed,
  inProgress,
  planned,
  remaining
}: KpiCountersProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        mb: 2,
      }}
      role="region"
      aria-label="Course progress summary"
    >
      <KpiChip
        icon={<CheckCircle sx={{ fontSize: 16 }} />}
        label="Completed"
        value={completed}
        color="var(--primary)"
        backgroundColor="var(--primary-tint)"
      />
      <KpiChip
        icon={<Schedule sx={{ fontSize: 16 }} />}
        label="In Progress"
        value={inProgress}
        color="var(--action-info)"
        backgroundColor="rgba(25, 118, 210, 0.05)"
      />
      <KpiChip
        icon={<Event sx={{ fontSize: 16 }} />}
        label="Planned"
        value={planned}
        color="var(--muted-foreground)"
        backgroundColor="var(--muted)"
      />
      <KpiChip
        icon={<PendingActions sx={{ fontSize: 16 }} />}
        label="Remaining"
        value={remaining}
        color="var(--destructive)"
        backgroundColor="rgba(239, 68, 68, 0.05)"
      />
    </Box>
  );
}
