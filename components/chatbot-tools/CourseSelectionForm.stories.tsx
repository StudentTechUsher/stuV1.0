import type { Meta, StoryObj } from '@storybook/react';

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

1. \\`npm run dev\\`
2. Navigate to \\`/grad-plan/create\\`
3. Complete Program Selection to reach Course Selection

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
