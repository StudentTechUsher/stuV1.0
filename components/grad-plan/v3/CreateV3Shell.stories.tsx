import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { expect, fn, userEvent, within } from '@storybook/test';
import CreateV3Shell from '@/components/grad-plan/v3/CreateV3Shell';
import GuidedStepCard from '@/components/grad-plan/v3/GuidedStepCard';
import GenerationModeCard from '@/components/grad-plan/v3/GenerationModeCard';
import ContextRail from '@/components/grad-plan/v3/ContextRail';
import GenerationProgressCard from '@/components/grad-plan/v3/GenerationProgressCard';
import AgentTracePanel from '@/components/grad-plan/v3/AgentTracePanel';
import {
  createMockV3Snapshot,
  mockV3SnapshotComplete,
  mockV3SnapshotFailure,
  mockV3SnapshotHappyPath,
  mockV3TraceEvents,
} from '@/lib/chatbot/grad-plan/v3/fixtures';
import { applyContextEvent } from '@/lib/chatbot/grad-plan/v3/reducer';
import type { AgentContextSnapshot, GenerationMode } from '@/lib/chatbot/grad-plan/v3/types';

const meta: Meta<typeof CreateV3Shell> = {
  title: 'Grad Plan/CreateV3/CreateV3Shell',
  component: CreateV3Shell,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/grad-plan/createV3',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

function buildSections(snapshot: AgentContextSnapshot) {
  return [
    {
      id: 'profile',
      title: 'Profile',
      status: snapshot.profile.confirmed ? 'complete' : 'missing',
      summary: snapshot.profile.confirmed
        ? `${snapshot.profile.studentType ?? 'student'} profile confirmed`
        : 'Needs confirmation',
    },
    {
      id: 'transcript',
      title: 'Transcript',
      status: snapshot.transcript.choice ? 'complete' : 'missing',
      summary: snapshot.transcript.choice
        ? `Choice: ${snapshot.transcript.choice}`
        : 'Select transcript path',
    },
    {
      id: 'programs',
      title: 'Programs',
      status: snapshot.programs.selected.length > 0 ? 'complete' : 'in_progress',
      summary: snapshot.programs.selected.length > 0
        ? snapshot.programs.selected.map((program) => program.programName).join(', ')
        : 'Pick at least one program',
    },
    {
      id: 'courses',
      title: 'Courses',
      status: snapshot.courses.totalCreditsToComplete > 0 ? 'complete' : 'in_progress',
      summary: `Remaining credits: ${snapshot.courses.totalCreditsToComplete}`,
    },
    {
      id: 'distribution',
      title: 'Distribution',
      status: snapshot.distribution.strategy ? 'complete' : 'missing',
      summary: snapshot.distribution.strategy
        ? `${snapshot.distribution.strategy} (${snapshot.distribution.minCreditsPerTerm ?? '-'}-${snapshot.distribution.maxCreditsPerTerm ?? '-'})`
        : 'Choose credit envelope',
    },
    {
      id: 'generation',
      title: 'Generation',
      status: snapshot.generation.style ? 'in_progress' : 'missing',
      summary: snapshot.generation.style
        ? `${snapshot.generation.style} · ${snapshot.generation.status}`
        : 'Choose generation mode',
    },
  ] as const;
}

function DemoShell({
  snapshot,
  generationConnected = true,
  showTrace = true,
}: {
  snapshot: AgentContextSnapshot;
  generationConnected?: boolean;
  showTrace?: boolean;
}) {
  const sections = useMemo(() => buildSections(snapshot), [snapshot]);

  return (
    <CreateV3Shell
      progressCard={
        <GenerationProgressCard
          phase={snapshot.generation.phase ?? 'queued'}
          percent={snapshot.generation.progressPercent}
          message={snapshot.generation.message}
          connected={generationConnected}
        />
      }
      main={
        <GuidedStepCard
          stepNumber={7}
          totalSteps={7}
          title="Choose generation style"
          description="Automatic mode runs all phases continuously. Active feedback mode pauses for checkpoints."
          primaryAction={{ label: 'Continue' }}
          secondaryAction={{ label: 'Back' }}
          helperText="Every choice is written to canonical context and available to the agent runtime."
        >
          <GenerationModeCard value={snapshot.generation.style} disabled />
        </GuidedStepCard>
      }
      contextRail={<ContextRail sections={sections} />}
      tracePanel={showTrace ? <AgentTracePanel events={mockV3TraceEvents} /> : undefined}
    />
  );
}

export const HappyPathWithTranscript: Story = {
  render: () => <DemoShell snapshot={mockV3SnapshotHappyPath} />,
};

export const HappyPathNoTranscript: Story = {
  render: () => (
    <DemoShell
      snapshot={createMockV3Snapshot({
        profile: {
          confirmed: true,
          studentType: 'undergraduate',
          admissionYear: 2024,
          estimatedGraduationTerm: 'Spring',
          estimatedGraduationYear: 2028,
        },
        transcript: {
          choice: 'without_transcript',
          hasTranscript: false,
          transcriptRecordId: null,
          completedCourseCodes: [],
          lastEvaluatedAt: null,
        },
        programs: {
          selected: [
            {
              programId: 55,
              programName: 'Psychology',
              programType: 'major',
            },
          ],
        },
        courses: {
          selectedCourses: [],
          requestedElectives: [],
          requirementBuckets: [],
          remainingRequirementCredits: 45,
          requestedElectiveCredits: 0,
          totalCreditsToComplete: 45,
          totalSelectedCredits: 45,
        },
        distribution: {
          strategy: 'balanced',
          minCreditsPerTerm: 14,
          maxCreditsPerTerm: 16,
          targetCreditsPerTerm: 15,
          includeSecondaryTerms: false,
        },
        generation: {
          style: 'automatic',
          status: 'queued',
          phase: 'queued',
          progressPercent: 0,
          message: 'Ready to start generation',
          jobId: null,
          outputAccessId: null,
          errorCode: null,
          errorMessage: null,
          repairLoopCount: 0,
          lastEventAt: null,
        },
      })}
    />
  ),
};

export const ActiveFeedbackChoice: Story = {
  render: () => (
    <DemoShell
      snapshot={createMockV3Snapshot({
        generation: {
          style: 'active_feedback',
          status: 'idle',
          phase: null,
          progressPercent: 0,
          message: 'Waiting for first checkpoint',
          jobId: null,
          outputAccessId: null,
          errorCode: null,
          errorMessage: null,
          repairLoopCount: 0,
          lastEventAt: null,
        },
      })}
      showTrace={false}
    />
  ),
};

export const ReconnectingAndFailed: Story = {
  render: () => <DemoShell snapshot={mockV3SnapshotFailure} generationConnected={false} />,
};

export const CompletedAndReady: Story = {
  render: () => <DemoShell snapshot={mockV3SnapshotComplete} />,
};

function InteractiveModeSelection() {
  const [snapshot, setSnapshot] = useState(
    createMockV3Snapshot({
      profile: {
        confirmed: true,
        studentType: 'undergraduate',
        admissionYear: 2024,
        estimatedGraduationTerm: 'Spring',
        estimatedGraduationYear: 2028,
      },
      transcript: {
        choice: 'use_current',
        hasTranscript: true,
        transcriptRecordId: 'trx-201',
        completedCourseCodes: ['ENGL101'],
        lastEvaluatedAt: '2026-02-26T11:59:00.000Z',
      },
      programs: {
        selected: [
          {
            programId: 101,
            programName: 'Computer Science',
            programType: 'major',
          },
        ],
      },
      courses: {
        selectedCourses: [],
        requestedElectives: [],
        requirementBuckets: [],
        remainingRequirementCredits: 36,
        requestedElectiveCredits: 3,
        totalCreditsToComplete: 39,
        totalSelectedCredits: 45,
      },
      distribution: {
        strategy: 'balanced',
        minCreditsPerTerm: 15,
        maxCreditsPerTerm: 18,
        targetCreditsPerTerm: 16,
        includeSecondaryTerms: false,
      },
    })
  );

  const handleModeChange = (mode: GenerationMode) => {
    setSnapshot((current) =>
      applyContextEvent(current, {
        id: `event-${mode}`,
        sessionId: current.meta.sessionId ?? 'session-storybook',
        schemaVersion: current.schemaVersion,
        type: 'generation_mode_selected',
        payload: { style: mode },
        actor: 'user',
        createdAt: new Date().toISOString(),
      })
    );
  };

  return (
    <CreateV3Shell
      progressCard={
        <GenerationProgressCard
          phase={snapshot.generation.phase ?? 'queued'}
          percent={snapshot.generation.progressPercent}
          message={snapshot.generation.message}
          connected
        />
      }
      main={
        <GuidedStepCard
          stepNumber={7}
          totalSteps={7}
          title="Choose generation style"
          description="This interaction story validates step transitions and context synchronization."
          primaryAction={{ label: 'Continue', onClick: fn() }}
          secondaryAction={{ label: 'Back', onClick: fn() }}
          helperText="Selection updates the context rail immediately."
        >
          <GenerationModeCard value={snapshot.generation.style} onChange={handleModeChange} />
        </GuidedStepCard>
      }
      contextRail={<ContextRail sections={buildSections(snapshot)} />}
      tracePanel={<AgentTracePanel events={mockV3TraceEvents} />}
    />
  );
}

export const Interaction_ModeSelectionUpdatesContext: Story = {
  render: () => <InteractiveModeSelection />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Automatic Generation' }));
    await expect(canvas.getByText('automatic · idle')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Active Feedback' }));
    await expect(canvas.getByText('active_feedback · idle')).toBeInTheDocument();
  },
};

export const MobileViewport: Story = {
  render: () => <DemoShell snapshot={mockV3SnapshotHappyPath} />,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
