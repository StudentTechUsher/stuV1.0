# Storybook for Stu

## Quick Start

```bash
pnpm storybook
```

Opens at **http://localhost:6006**

## Current Status: ✅ Working

- **Version:** Storybook 10.2.0
- **Framework:** Next.js 15.5.9 + React 19
- **Styling:** Tailwind CSS v4.1.14

## What's Available

### Example Stories
- `components/ui/button.stories.tsx` - 11 button variants
- `components/ui/card.stories.tsx` - 5 card examples
- `components/ui/input.stories.tsx` - 8 input examples
- `components/ui/switch.stories.tsx` - 7 switch examples

### Features
✅ Component development environment
✅ Hot module replacement
✅ Tailwind CSS v4 styling
✅ Custom university theme switcher (3 presets)
✅ Dark mode support
✅ Font loading (Geist Sans/Mono)
✅ TypeScript support
✅ Path aliases (`@/`)

### Temporarily Missing
⏸️ Interactive controls panel (addon not yet available for v10)
⏸️ Auto-generated docs (addon not yet available for v10)
⏸️ Accessibility checks (addon not yet available for v10)

*These will be restored when Storybook addons are updated to v10*

## Documentation

- **SETUP.md** - Installation, configuration, troubleshooting
- **WRITING_STORIES.md** - How to create stories, best practices
- **COMPONENT_DEVELOPMENT.md** - Development workflow, TDD approach
- **STORYBOOK_10_STATUS.md** - Current v10 status and addon availability
- **KNOWN_ISSUES.md** - Resolved issues and current limitations

## Creating New Stories

1. Create a `.stories.tsx` file next to your component
2. Follow the pattern in the example stories
3. Use the template from `WRITING_STORIES.md`

Example:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './your-component';

const meta = {
  title: 'UI/YourComponent',
  component: YourComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // your props
  },
};
```

## Building for Production

```bash
pnpm storybook:build
```

Creates static site in `storybook-static/` for deployment.

## Need Help?

- Check `docs/storybook/SETUP.md` for troubleshooting
- See example stories for patterns
- Read `WRITING_STORIES.md` for best practices

## Next Steps

1. Run `pnpm storybook` to start
2. Browse the example stories
3. Create stories for your components
4. Monitor for addon v10 releases to restore full functionality
