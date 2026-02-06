import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Grad Plan/Create/ToolRenderer',
  component: () => null,
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
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

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
