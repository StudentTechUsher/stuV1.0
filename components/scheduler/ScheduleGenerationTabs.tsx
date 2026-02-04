'use client';

import { Tabs, Tab, Box } from '@mui/material';

interface ScheduleGenerationTabsProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
}

const TAB_LABELS = [
  'Personal Events',
  'Courses',
  'Preferences',
  'Preview',
];

export default function ScheduleGenerationTabs({
  currentStep,
  onStepChange,
}: Readonly<ScheduleGenerationTabsProps>) {
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    onStepChange((newValue + 1) as 1 | 2 | 3 | 4);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={currentStep - 1}
        onChange={handleChange}
        variant="fullWidth"
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 48,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: '#047857',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#06C96C',
            height: 3,
          },
        }}
      >
        {TAB_LABELS.map((label, index) => (
          <Tab key={index} label={label} />
        ))}
      </Tabs>
    </Box>
  );
}
