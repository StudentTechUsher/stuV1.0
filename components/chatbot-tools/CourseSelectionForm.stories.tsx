import type { Meta, StoryObj } from '@storybook/react';
import CourseSelectionForm from './CourseSelectionForm';
import type { ProgramRow } from '@/types/program';

const meta = {
  title: 'Grad Plan/Create/CourseSelectionForm',
  component: () => null,
  parameters: {
    layout: 'centered',
	    docs: {
	      description: {
	        component: `
# CourseSelectionForm

This step depends on program requirements, GenEd requirements, transcript data, and live course catalogs. It is best validated in the running app:

1. \`npm run dev\`
2. Navigate to \`/grad-plan/create\`
3. Complete Program Selection to reach Course Selection

**Required env vars for app runtime:**
- \`NEXT_PUBLIC_SUPABASE_URL\`
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`

**Data dependencies:**
- Program requirements (course flows)
- GenEd requirements
- Transcript-matching utilities
- Course offering catalog

This Storybook entry is documentation-only.
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DocsOnly: Story = {
  render: () => (
    <div style={{ maxWidth: 520, padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h3 style={{ margin: 0, fontSize: 18 }}>CourseSelectionForm</h3>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        This component needs live program and course catalog data. Use the running app to test.
      </p>
      <pre style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
        npm run dev
        {'\n'}Open /grad-plan/create
      </pre>
    </div>
  ),
};

const mockProgramsData: ProgramRow[] = [
  {
    id: '101',
    university_id: 1,
    name: 'Computer Science',
    program_type: 'major',
    version: 1,
    created_at: new Date().toISOString(),
    modified_at: null,
    requirements: {
      programRequirements: [
        {
          description: 'Complete 2 Courses',
          requirementId: 1,
          courses: [
            { code: 'CS 101', title: 'Intro to CS', credits: 3 },
            { code: 'CS 102', title: 'Data Structures', credits: 3 },
            { code: 'CS 201', title: 'Algorithms', credits: 3 },
          ],
        },
      ],
    },
  },
];

const mockGenEdData: ProgramRow[] = [
  {
    id: '201',
    university_id: 1,
    name: 'General Education',
    program_type: 'general_education',
    version: 1,
    created_at: new Date().toISOString(),
    modified_at: null,
    requirements: [
      {
        subtitle: 'Written Communication',
        blocks: [
          { type: 'course', code: 'ENG 101', title: 'Composition', credits: { fixed: 3 } },
          { type: 'course', code: 'ENG 102', title: 'Rhetoric', credits: { fixed: 3 } },
        ],
      },
    ],
  },
];

export const VersionB_ReadOnly: Story = {
  render: () => (
    <div style={{ maxWidth: 900 }}>
      <CourseSelectionForm
        studentType="undergraduate"
        universityId={1}
        selectedProgramIds={[101]}
        genEdProgramIds={[201]}
        hasTranscript
        onSubmit={() => {}}
        readOnly
        mockMode
        mockProgramsData={mockProgramsData}
        mockGenEdData={mockGenEdData}
        mockTranscriptCourses={[
          { code: 'ENG 101', title: 'Composition', credits: 3 },
        ]}
      />
    </div>
  ),
};

/**
 * Dark mode preview (docs-only placeholder)
 */
export const DarkMode: Story = {
  ...DocsOnly,
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    ...(DocsOnly.parameters ?? {}),
    backgrounds: { default: 'dark' },
  },
};

/**
 * Dark mode preview for Version B read-only component
 */
export const VersionB_ReadOnly_DarkMode: Story = {
  ...VersionB_ReadOnly,
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    ...(VersionB_ReadOnly.parameters ?? {}),
    backgrounds: { default: 'dark' },
  },
};
