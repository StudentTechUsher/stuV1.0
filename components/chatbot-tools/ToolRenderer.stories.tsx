import type { Meta, StoryObj } from '@storybook/react';
import ToolRenderer, { type ToolType } from './ToolRenderer';
import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';
import type { CareerSuggestionsInput } from '@/lib/chatbot/tools/careerSuggestionsTool';
import type { ProgramSuggestionsInput } from '@/lib/chatbot/tools/programSuggestionsTool';
import type { ProgramRow } from '@/types/program';

const meta = {
  title: 'Grad Plan/Create/ToolRenderer',
  component: ToolRenderer,
  parameters: {
    layout: 'centered',
	    docs: {
	      description: {
	        component: `
# ToolRenderer

ToolRenderer is the orchestrator for step-level tools in \`/grad-plan/create\`. It routes to UI components that depend on authenticated data and backend APIs.

**In-app testing path:**
1. \`npm run dev\`
2. Navigate to \`/grad-plan/create\`
3. Progress through steps to see tool routing

This Storybook entry is documentation-only.
	        `,
	      },
	    },
	  },
  tags: ['autodocs'],
  argTypes: {
    toolType: {
      control: { type: 'select' },
      options: [
        'profile_update',
        'profile_check',
        'transcript_check',
        'student_type',
        'program_selection',
        'course_selection',
        'credit_distribution',
        'milestones_and_constraints',
        'generate_plan_confirmation',
        'career_suggestions',
        'program_suggestions',
        'active_feedback_plan',
      ] satisfies ToolType[],
    },
    readOnly: { control: 'boolean' },
    requiresApproval: { control: 'boolean' },
    variant: {
      control: { type: 'select' },
      options: ['default', 'versionB'],
    },
  },
} satisfies Meta<typeof ToolRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

const academicTerms: AcademicTermsConfig = {
  terms: {
    primary: [
      { id: 'fall', label: 'Fall' },
      { id: 'spring', label: 'Spring' },
    ],
    secondary: [
      { id: 'summer', label: 'Summer' },
    ],
  },
  system: 'semester_with_terms',
  ordering: ['fall', 'spring', 'summer'],
  academic_year_start: 'fall',
};

const baseProgramRow: Omit<ProgramRow, 'id' | 'name' | 'program_type'> = {
  university_id: 1,
  version: '1',
  created_at: new Date().toISOString(),
  modified_at: null,
  requirements: {},
  target_total_credits: 120,
};

const mockProgramsData: ProgramRow[] = [
  {
    id: '101',
    name: 'Computer Science',
    program_type: 'major',
    ...baseProgramRow,
  },
  {
    id: '201',
    name: 'Psychology',
    program_type: 'minor',
    ...baseProgramRow,
  },
];

const mockGenEdData: ProgramRow[] = [
  {
    id: '301',
    name: 'General Education',
    program_type: 'general_education',
    ...baseProgramRow,
    target_total_credits: 30,
  },
];

const mockTranscriptCourses = [
  { code: 'CS 101', title: 'Intro to CS', credits: 3 },
  { code: 'MATH 121', title: 'Calculus I', credits: 4 },
];

const mockDistribution: SemesterAllocation[] = [
  {
    term: 'Fall 2026',
    termType: 'primary',
    year: 2026,
    suggestedCredits: 15,
    minCredits: 12,
    maxCredits: 18,
  },
  {
    term: 'Spring 2027',
    termType: 'primary',
    year: 2027,
    suggestedCredits: 15,
    minCredits: 12,
    maxCredits: 18,
  },
];

const mockCareerSuggestions: CareerSuggestionsInput = {
  user_goal: 'Data Science',
  suggested_careers: [
    { title: 'Data Scientist', description: 'Analyze large datasets to inform decisions.' },
    { title: 'ML Engineer', description: 'Build and deploy machine learning systems.' },
  ],
};

const mockProgramSuggestions: ProgramSuggestionsInput = [
  {
    program_name: 'Computer Science',
    program_type: 'major',
    match_score: 92,
    reason: 'Strong alignment with your interest in data science.',
    typical_courses: ['CS 201', 'CS 301', 'CS 401', 'CS 410'],
    career_alignment: 'Data science and machine learning roles',
  },
  {
    program_name: 'Business Analytics',
    program_type: 'minor',
    match_score: 81,
    reason: 'Pairs well with CS for applied analytics roles.',
    typical_courses: ['BA 210', 'BA 320'],
    career_alignment: 'Analytics and product roles',
  },
];

const buildToolData = (toolType: ToolType) => {
  switch (toolType) {
    case 'profile_update':
      return {
        currentValues: {
          est_grad_date: '2028-05-01',
          est_grad_sem: 'Spring',
          career_goals: 'Data Science',
          admission_year: 2024,
          is_transfer: 'freshman',
        },
        universityId: 1,
        hasActivePlan: false,
      };
    case 'profile_check':
      return { userId: 'user-123' };
    case 'transcript_check':
      return { hasCourses: true, academicTerms };
    case 'student_type':
      return {};
    case 'program_selection':
      return {
        studentType: 'undergraduate',
        universityId: 1,
        studentAdmissionYear: 2024,
        studentIsTransfer: 'freshman',
        selectedGenEdProgramId: 301,
      };
    case 'course_selection':
      return {
        studentType: 'undergraduate',
        universityId: 1,
        selectedProgramIds: [101],
        genEdProgramIds: [301],
        userId: 'user-123',
        hasTranscript: true,
        mockMode: true,
        mockProgramsData,
        mockGenEdData,
        mockTranscriptCourses,
      };
    case 'credit_distribution':
      return {
        totalCredits: 120,
        totalCourses: 40,
        studentData: {
          admission_year: 2024,
          admission_term: 'Fall',
          est_grad_date: '2028-05-01',
        },
        hasTranscript: true,
        academicTerms,
      };
    case 'milestones_and_constraints':
      return {
        distribution: mockDistribution,
        studentType: 'undergraduate',
      };
    case 'generate_plan_confirmation':
      return {
        academicTerms,
        lastCompletedTerm: 'Spring 2026',
        preferredStartTerms: ['Fall'],
      };
    case 'career_suggestions':
      return { careerSuggestions: mockCareerSuggestions };
    case 'program_suggestions':
      return { programSuggestions: mockProgramSuggestions };
    case 'active_feedback_plan':
      return {
        courseData: { programs: [], totalSelectedCredits: 30 },
        suggestedDistribution: mockDistribution,
        academicTermsConfig: academicTerms,
        workStatus: 'part_time',
        milestones: [{ id: 'milestone-1', type: 'internship', title: 'Summer Internship' }],
      };
    default:
      return {};
  }
};

export const DocsOnly: Story = {
  render: () => (
    <div style={{ maxWidth: 520, padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h3 style={{ margin: 0, fontSize: 18 }}>ToolRenderer</h3>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        ToolRenderer switches between live tool UIs. Use the running app to validate routing.
      </p>
      <pre style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
        npm run dev
        {'\n'}Open /grad-plan/create
      </pre>
    </div>
  ),
};

export const Mocked: Story = {
  args: {
    toolType: 'credit_distribution',
    readOnly: false,
    requiresApproval: false,
    variant: 'versionB',
  },
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <ToolRenderer
        toolType={args.toolType}
        toolData={buildToolData(args.toolType)}
        onToolComplete={() => {}}
        readOnly={args.readOnly}
        requiresApproval={args.requiresApproval}
        agentStatus={args.requiresApproval ? 'awaiting_approval' : 'idle'}
        onApprove={() => {}}
        onReject={() => {}}
        variant={args.variant}
      />
    </div>
  ),
};

export const VersionB_ReadOnlyApproval: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <ToolRenderer
        toolType="student_type"
        toolData={buildToolData('student_type')}
        onToolComplete={() => {}}
        readOnly
        requiresApproval
        agentStatus="awaiting_approval"
        onApprove={() => {}}
        onReject={() => {}}
      />
    </div>
  ),
};
