import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Grad Plan/Create/TranscriptCheckForm',
  component: () => null,
  parameters: {
    layout: 'centered',
	    docs: {
	      description: {
	        component: `
# TranscriptCheckForm

This component depends on authenticated user state, transcript uploads, and API calls. It is best exercised in the running app:

1. \`npm run dev\`
2. Navigate to \`/grad-plan/create\`
3. Complete Profile Check to reach Transcript Check

**Data dependencies:**
- User auth session
- Transcript upload pipeline
- \`fetchUserCoursesAction\` / \`fetchUserCoursesMetadataAction\`

This Storybook entry is documentation-only to avoid breaking production flows.
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
      <h3 style={{ margin: 0, fontSize: 18 }}>TranscriptCheckForm</h3>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        This component requires authenticated user data and transcript uploads. Use the running app to test.
      </p>
      <pre style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
        npm run dev
        {'\n'}Open /grad-plan/create
      </pre>
    </div>
  ),
};
