import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper } from '@mui/material';
import type { SchedulePreferences } from '@/lib/services/scheduleService';
import type { GradPlanDetails } from '@/lib/utils/gradPlanHelpers';

/**
 * AgentSchedulerWithSetup provides an AI-guided conversational interface
 * for selecting courses and building a semester schedule.
 *
 * 📝 NOTE: These stories show a demo/documentation view of the component.
 * The actual component requires live database connections.
 *
 * To test the real component:
 * 1. Run: npm run dev
 * 2. Navigate to /scheduler
 * 3. Select a term to see the agent in action
 */
const meta = {
  title: 'Scheduler/Agent/AgentSchedulerWithSetup',
  component: () => null, // Placeholder
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# AI-Guided Course Scheduler

An interactive conversational interface for selecting courses and building semester schedules.

## Features

- **Smart Ranking**: Sections scored 0-100 based on preferences
- **Conflict Detection**: Automatically filters incompatible sections
- **Progress Tracking**: Visual indicators and completed course chips
- **Backup Selection**: Choose 2 backup sections for each course
- **Message History**: Collapsible conversation log
- **Error Recovery**: Retry, skip, or restart options

## How It Works

1. Student selects a term from graduation plan
2. Agent extracts courses for that term
3. For each course:
   - Fetches available sections from database
   - Filters out conflicts with calendar
   - Ranks by preferences (time, days, availability)
   - Student selects primary + 2 backups
   - Saves to database
   - Updates calendar
4. Completion screen shows all scheduled courses

## Props

\`\`\`typescript
interface AgentSchedulerWithSetupProps {
  termName: string;
  termIndex: number;
  universityId: number;
  studentId: number;
  scheduleId: string;
  gradPlanDetails: GradPlanDetails | null;
  gradPlanId?: string;
  existingPersonalEvents: PersonalEvent[];
  existingPreferences: SchedulePreferences;
  onComplete?: () => void;
  onCalendarUpdate?: (events: SchedulerEvent[]) => void;
}
\`\`\`

## Usage

\`\`\`tsx
<AgentSchedulerWithSetup
  termName="Fall 2026"
  termIndex={0}
  universityId={1}
  studentId={123}
  scheduleId="schedule-123"
  gradPlanDetails={planDetails}
  existingPersonalEvents={personalEvents}
  existingPreferences={preferences}
  onComplete={() => console.log('Done!')}
/>
\`\`\`

## Architecture

**State Machine Phases:**
- \`welcome\` → \`fetching_sections\` → \`awaiting_primary\` → \`awaiting_waitlist_confirmation\` → \`awaiting_backup_1\` → \`awaiting_backup_2\` → \`saving_selection\` → \`course_complete\` → Next course

**Dependencies:**
- \`CourseSelectionOrchestrator\` - Manages flow
- \`SectionSelectionCard\` - Displays options
- Course selection tools (fetch, conflict check, ranking, save)

## Testing

Since this component requires live database access, test it in the running app:

\`\`\`bash
npm run dev
# Navigate to http://localhost:3000/scheduler
\`\`\`

## Related Components

- [\`SectionSelectionCard\`](?path=/docs/scheduler-agent-sectionselectioncard--docs) - Section display card
- \`ScheduleGenerationPanel\` - Original non-agent scheduler
- \`CourseScheduler\` - Parent container component
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Demo data for documentation
const mockGradPlanDetails: GradPlanDetails = {
  plan: [
    {
      term: 'Fall 2026',
      notes: '',
      courses: [
        { code: 'CS 450', title: 'Software Engineering', credits: 3 },
        { code: 'CS 460', title: 'Database Systems', credits: 3 },
        { code: 'MATH 290', title: 'Linear Algebra', credits: 4 },
      ],
      credits_planned: 10,
      is_active: true,
      termPassed: false,
    },
  ],
};

const mockPreferences: SchedulePreferences = {
  earliest_class_time: '08:00:00',
  latest_class_time: '17:00:00',
  preferred_days: [1, 3, 5], // MWF
  avoid_days: [],
  max_daily_hours: 6,
  lunch_break_required: true,
  lunch_start_time: '12:00:00',
  lunch_end_time: '13:00:00',
  allow_waitlist: true,
};

const mockPersonalEvents = [
  {
    id: '1',
    title: 'Work',
    category: 'Work' as const,
    day_of_week: 2,
    start_time: '14:00:00',
    end_time: '18:00:00',
  },
];

/**
 * Component Demo - See in Running App
 *
 * This component requires live Supabase connections and cannot be
 * fully demonstrated in Storybook.
 */
export const ComponentDemo: Story = {
  render: () => (
    <Box
      sx={{
        width: 420,
        height: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 360, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          🤖 AI Course Scheduler
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This component requires live database access and is best viewed in the running application.
        </Typography>
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--surface)',
            borderRadius: 2,
            border: '1px solid var(--border)',
            textAlign: 'left',
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
            To test:
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
            1. npm run dev
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
            2. Navigate to /scheduler
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
            3. Select a term
          </Typography>
        </Box>
      </Paper>
    </Box>
  ),
};

/**
 * Example Props Configuration
 */
export const ExampleProps: Story = {
  render: () => (
    <Box sx={{ p: 4, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
        Example Configuration
      </Typography>
      <Paper sx={{ p: 2, bgcolor: 'var(--surface)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {`<AgentSchedulerWithSetup
  termName="Fall 2026"
  termIndex={0}
  universityId={1}
  studentId={123}
  scheduleId="schedule-abc"
  gradPlanDetails={{
    plan: [{
      term: "Fall 2026",
      courses: [
        { code: "CS 450", ... },
        { code: "CS 460", ... }
      ]
    }]
  }}
  existingPersonalEvents={[
    {
      id: "1",
      title: "Work",
      category: "Work",
      day_of_week: 2,
      start_time: "14:00:00",
      end_time: "18:00:00"
    }
  ]}
  existingPreferences={{
    earliest_class_time: "08:00:00",
    latest_class_time: "17:00:00",
    preferred_days: [1, 3, 5],
    max_daily_hours: 6,
    lunch_break_required: true,
    allow_waitlist: true
  }}
  onComplete={() => console.log("Done!")}
  onCalendarUpdate={(events) => {
    console.log("Calendar updated:", events);
  }}
/>`}
        </pre>
      </Paper>
    </Box>
  ),
};

/**
 * Visual Flow Diagram
 */
export const FlowDiagram: Story = {
  render: () => (
    <Box sx={{ p: 4, maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
        User Flow
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {[
          { phase: 'Welcome', desc: 'Greeting and course overview', action: 'Click "Let\'s go!"' },
          { phase: 'Fetching', desc: 'Loading available sections', action: 'Wait' },
          { phase: 'Primary Selection', desc: 'Choose main section', action: 'Click section card' },
          { phase: 'Waitlist Check', desc: 'Confirm if waitlisted', action: 'Yes/No' },
          { phase: 'Backup 1', desc: 'Choose first backup', action: 'Click section card' },
          { phase: 'Backup 2', desc: 'Choose second backup', action: 'Click section card' },
          { phase: 'Saving', desc: 'Save to database', action: 'Wait' },
          { phase: 'Complete', desc: 'Course done, move to next', action: 'Auto-advance' },
        ].map((step, idx) => (
          <Paper key={idx} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              {idx + 1}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {step.phase}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {step.desc}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>
              {step.action}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  ),
};
