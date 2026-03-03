import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  type AgentContextSnapshot,
  type StoredContextEventUnion,
  type TraceEvent,
} from '@/lib/chatbot/grad-plan/v3/types';
import { createInitialAgentContextSnapshot, reduceContextEvents } from '@/lib/chatbot/grad-plan/v3/reducer';

const BASE_TS = '2026-02-26T12:00:00.000Z';

export function createMockV3Snapshot(overrides: Partial<AgentContextSnapshot> = {}): AgentContextSnapshot {
  return createInitialAgentContextSnapshot({
    meta: {
      sessionId: 'session-storybook',
      conversationId: 'conversation-storybook',
      createdAt: BASE_TS,
      updatedAt: BASE_TS,
    },
    ...overrides,
  });
}

export const mockV3ContextEvents: StoredContextEventUnion[] = [
  {
    sequenceId: 1,
    id: 'evt-1',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'profile_confirmed',
    actor: 'user',
    createdAt: '2026-02-26T12:00:01.000Z',
    payload: {
      confirmed: true,
      studentType: 'undergraduate',
      admissionYear: 2023,
      estimatedGraduationTerm: 'Spring',
      estimatedGraduationYear: 2028,
    },
  },
  {
    sequenceId: 2,
    id: 'evt-2',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'transcript_choice_set',
    actor: 'user',
    createdAt: '2026-02-26T12:00:04.000Z',
    payload: {
      choice: 'use_current',
      transcriptRecordId: 'trx-1022',
      completedCourseCodes: ['ENGL101', 'MATH145'],
      lastEvaluatedAt: '2026-02-26T12:00:03.000Z',
    },
  },
  {
    sequenceId: 3,
    id: 'evt-3',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'programs_selected',
    actor: 'user',
    createdAt: '2026-02-26T12:00:08.000Z',
    payload: {
      selectedPrograms: [
        {
          programId: 101,
          programName: 'Computer Science',
          programType: 'major',
        },
        {
          programId: 205,
          programName: 'Mathematics',
          programType: 'minor',
        },
      ],
    },
  },
  {
    sequenceId: 4,
    id: 'evt-4',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'course_selection_submitted',
    actor: 'user',
    createdAt: '2026-02-26T12:00:14.000Z',
    payload: {
      selectedCourses: [
        {
          courseCode: 'CS201',
          courseTitle: 'Data Structures',
          credits: 3,
          source: 'major',
          requirementBucketKey: 'major-core',
        },
      ],
      requestedElectives: [
        {
          courseCode: 'MUS101',
          courseTitle: 'Intro to Music Theory',
          credits: 3,
          source: 'elective',
          requirementBucketKey: null,
        },
      ],
      requirementBuckets: [
        {
          bucketKey: 'major-core',
          bucketLabel: 'Major Core',
          requirementType: 'major',
          requiredCredits: 42,
          completedCredits: 12,
          remainingCredits: 30,
          candidateCourseCodes: ['CS201', 'CS240', 'CS301'],
        },
        {
          bucketKey: 'gened-humanities',
          bucketLabel: 'Humanities',
          requirementType: 'gen_ed',
          requiredCredits: 9,
          completedCredits: 3,
          remainingCredits: 6,
          candidateCourseCodes: ['HIST150', 'PHIL110'],
        },
      ],
      remainingRequirementCredits: 36,
      requestedElectiveCredits: 3,
      totalCreditsToComplete: 39,
      totalSelectedCredits: 45,
    },
  },
  {
    sequenceId: 5,
    id: 'evt-5',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'distribution_selected',
    actor: 'user',
    createdAt: '2026-02-26T12:00:19.000Z',
    payload: {
      strategy: 'balanced',
      minCreditsPerTerm: 15,
      maxCreditsPerTerm: 18,
      targetCreditsPerTerm: 16,
      includeSecondaryTerms: false,
    },
  },
  {
    sequenceId: 6,
    id: 'evt-6',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'constraints_selected',
    actor: 'user',
    createdAt: '2026-02-26T12:00:23.000Z',
    payload: {
      workStatus: 'part_time',
      milestones: [
        {
          id: 'milestone-1',
          label: 'Internship Summer 2027',
          timing: 'specific_term',
          term: 'Summer',
          year: 2027,
        },
      ],
      notes: 'Keep Fridays lighter because of work schedule.',
    },
  },
  {
    sequenceId: 7,
    id: 'evt-7',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'generation_mode_selected',
    actor: 'user',
    createdAt: '2026-02-26T12:00:27.000Z',
    payload: {
      style: 'automatic',
    },
  },
  {
    sequenceId: 8,
    id: 'evt-8',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'generation_phase_updated',
    actor: 'agent',
    createdAt: '2026-02-26T12:00:29.000Z',
    payload: {
      phase: 'major_skeleton',
      status: 'running',
      progressPercent: 15,
      message: 'Building plan skeleton from next term.',
      jobId: 'job-storybook',
    },
  },
  {
    sequenceId: 9,
    id: 'evt-9',
    sessionId: 'session-storybook',
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    type: 'generation_phase_updated',
    actor: 'agent',
    createdAt: '2026-02-26T12:00:35.000Z',
    payload: {
      phase: 'gen_ed_fill',
      status: 'running',
      progressPercent: 65,
      message: 'Filling remaining general education requirements.',
      jobId: 'job-storybook',
    },
  },
];

export const mockV3SnapshotHappyPath = reduceContextEvents(mockV3ContextEvents, createMockV3Snapshot());

export const mockV3SnapshotComplete = reduceContextEvents(
  [
    ...mockV3ContextEvents,
    {
      sequenceId: 10,
      id: 'evt-10',
      sessionId: 'session-storybook',
      schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
      type: 'generation_completed',
      actor: 'agent',
      createdAt: '2026-02-26T12:00:48.000Z',
      payload: {
        outputAccessId: 'plan-access-001',
        jobId: 'job-storybook',
        message: 'Plan generated and saved.',
      },
    },
  ],
  createMockV3Snapshot()
);

export const mockV3SnapshotFailure = reduceContextEvents(
  [
    ...mockV3ContextEvents,
    {
      sequenceId: 10,
      id: 'evt-10-failed',
      sessionId: 'session-storybook',
      schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
      type: 'generation_failed',
      actor: 'agent',
      createdAt: '2026-02-26T12:00:44.000Z',
      payload: {
        errorCode: 'heuristics_violation',
        errorMessage: 'Validation failed after repair loop',
        phase: 'verify_heuristics',
        jobId: 'job-storybook',
        details: {
          suggestedRepairPhases: ['major_fill'],
        },
      },
    },
  ],
  createMockV3Snapshot()
);

export const mockV3TraceEvents: TraceEvent[] = [
  {
    id: 'trace-1',
    sessionId: 'session-storybook',
    sequenceId: 1,
    ts: '2026-02-26T12:00:29.000Z',
    level: 'info',
    scope: 'phase',
    phase: 'major_skeleton',
    message: 'Phase started',
    payload: { phase: 'major_skeleton' },
    redacted: true,
  },
  {
    id: 'trace-2',
    sessionId: 'session-storybook',
    sequenceId: 2,
    ts: '2026-02-26T12:00:34.000Z',
    level: 'info',
    scope: 'skill',
    phase: 'major_fill',
    message: 'remaining-requirements-skill completed',
    payload: { checks: 4, suggestedRepairs: 0 },
    redacted: true,
  },
  {
    id: 'trace-3',
    sessionId: 'session-storybook',
    sequenceId: 3,
    ts: '2026-02-26T12:00:40.000Z',
    level: 'warn',
    scope: 'validation',
    phase: 'verify_heuristics',
    message: 'Credit envelope exceeded in one term',
    payload: {
      term: 'Fall 2027',
      targetMax: 18,
      actual: 19,
    },
    redacted: true,
  },
];
