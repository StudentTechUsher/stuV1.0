'use client';

import * as React from 'react';
import { Box, Container, Typography, ToggleButtonGroup, ToggleButton, Paper } from '@mui/material';
import { Person, SupervisorAccount } from '@mui/icons-material';
import ProgramProgressPanel from '@/components/progress/ProgramProgressPanel';
import { useProgramProgress } from '@/lib/hooks/useProgramProgress';
import type { AdvisorAction } from '@/types/program-progress';

export default function ProgramProgressDemo() {
  const [viewMode, setViewMode] = React.useState<'student' | 'advisor'>('student');
  const { data, isLoading, error } = useProgramProgress({
    useMockData: true,
  });

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'student' | 'advisor' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleAdvisorAction = async (action: AdvisorAction) => {
    console.log('Advisor action:', action);
    // In production, this would call an API endpoint
    // For demo, just log the action
    alert(`Advisor Action: ${action.type} for requirement ${action.requirementId}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          className="font-brand-bold"
          sx={{
            fontSize: '2.5rem',
            color: 'var(--foreground)',
            mb: 1,
          }}
        >
          Program Progress Demo
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'var(--muted-foreground)',
            mb: 3,
          }}
        >
          Demonstration of the Program Progress Panel with mock data. Toggle between student and advisor views.
        </Typography>

        {/* View Mode Toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="student" aria-label="student view">
            <Person sx={{ mr: 1 }} />
            Student View
          </ToggleButton>
          <ToggleButton value="advisor" aria-label="advisor view">
            <SupervisorAccount sx={{ mr: 1 }} />
            Advisor View
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Info Card */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: 'var(--primary-15)',
            border: '1px solid var(--primary)',
          }}
        >
          <Typography variant="body2" className="font-body-medium">
            <strong>Current Mode:</strong> {viewMode === 'student' ? 'Student (Read-only)' : 'Advisor (With Actions)'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--muted-foreground)' }}>
            {viewMode === 'student'
              ? 'Students can view their progress but cannot make changes.'
              : 'Advisors can approve requirements, waive credits, substitute courses, and add notes.'}
          </Typography>
        </Paper>
      </Box>

      {/* Progress Panel */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' },
          gap: 3,
          minHeight: '600px',
        }}
      >
        {/* Left side - Placeholder for grad planner content */}
        <Paper
          sx={{
            p: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--muted)',
            borderRadius: '12px',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" className="font-brand-bold" sx={{ mb: 2, color: 'var(--foreground)' }}>
              Graduation Planner
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
              This area would contain the graduation plan timeline/calendar view.
              <br />
              The Progress Panel is displayed on the right →
            </Typography>
          </Box>
        </Paper>

        {/* Right side - Progress Panel */}
        <Box sx={{ minHeight: '600px' }}>
          <ProgramProgressPanel
            data={data}
            isLoading={isLoading}
            error={error}
            isAdvisor={viewMode === 'advisor'}
            onAdvisorAction={handleAdvisorAction}
          />
        </Box>
      </Box>

      {/* Additional Info */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" className="font-brand-bold" sx={{ mb: 2 }}>
          Features Demonstrated
        </Typography>
        <Box component="ul" sx={{ color: 'var(--muted-foreground)' }}>
          <li>5 progress categories: Major, Minor, GE, Religion, Electives</li>
          <li>Category-specific color coding</li>
          <li>Interactive tabs with completion percentages</li>
          <li>KPI counters showing completed, in-progress, planned, and remaining credits</li>
          <li>Accordion-style requirement rows with nested subrequirements</li>
          <li>Course-level detail with status badges and term information</li>
          <li>Progress bars and fraction displays</li>
          <li>Advisor actions (approve, waive, substitute, add notes)</li>
          <li>Loading skeletons and error states</li>
          <li>Responsive design (try resizing the window)</li>
        </Box>
      </Box>
    </Container>
  );
}
