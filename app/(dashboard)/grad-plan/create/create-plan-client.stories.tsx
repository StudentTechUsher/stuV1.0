import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Grad Plan/Create/CreatePlanClient',
  component: () => null,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# CreatePlanClient (Page Client)

This is the main client for /grad-plan/create. It depends on authenticated session state, server-provided props, and API calls.

**In-app testing path:**
1. npm run dev
2. Navigate to /grad-plan/create

This Storybook entry is documentation-only to avoid coupling to live data sources.
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
      <h3 style={{ margin: 0, fontSize: 18 }}>CreatePlanClient</h3>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        This component requires authenticated server props and runtime APIs. Use the running app to test.
      </p>
      <pre style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
        npm run dev
        {'\n'}Open /grad-plan/create
      </pre>
    </div>
  ),
};
