import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Grad Plan/Create/ProgramSelectionForm',
  component: () => null,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# ProgramSelectionForm

Relies on program catalogs, GenEd filtering, and authenticated API calls. Use the running app to validate the full experience:

1. \\`npm run dev\\`
2. Navigate to \\`/grad-plan/create\\`
3. Proceed to Program Selection after Transcript Check

**Data dependencies:**
- Programs catalog by university
- GenEd logic by admission year / transfer status
- Optional pathfinder suggestions

This Storybook entry is documentation-only to avoid production coupling.
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
      <h3 style={{ margin: 0, fontSize: 18 }}>ProgramSelectionForm</h3>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        This component requires live program data and user context. Use the running app to test.
      </p>
      <pre style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
        npm run dev
        {'\n'}Open /grad-plan/create
      </pre>
    </div>
  ),
};
