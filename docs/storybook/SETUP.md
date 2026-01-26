# Storybook Setup Guide

This document covers how to run and configure Storybook for the Stu project.

## Running Storybook

### Development Mode

Start Storybook in development mode:

```bash
pnpm storybook
```

This will start the Storybook dev server at http://localhost:6006

The dev server includes:
- Hot module reloading for instant updates
- Interactive controls panel for testing component props
- Dark mode toggle
- University theme switcher
- Accessibility checks

### Building for Production

Build a static version of Storybook:

```bash
pnpm storybook:build
```

This creates a static site in the `storybook-static/` directory that can be:
- Deployed to Vercel, GitHub Pages, or any static hosting
- Shared with stakeholders via URL
- Used for visual regression testing

To preview the production build locally:

```bash
npx http-server storybook-static
```

## Project Structure

```
.storybook/
├── main.ts                           # Core Storybook configuration
├── preview.tsx                       # Global decorators and parameters
├── postcss.config.mjs                # PostCSS config for Tailwind v4
└── decorators/
    ├── theme-decorator.tsx           # University theme switcher
    └── mui-decorator.tsx             # Material-UI Emotion cache

components/ui/
├── button.stories.tsx                # Example button stories
├── card.stories.tsx                  # Example card stories
├── input.stories.tsx                 # Example input stories
└── switch.stories.tsx                # Example switch stories

docs/storybook/
├── SETUP.md                          # This file
├── WRITING_STORIES.md                # Guide for writing stories
└── COMPONENT_DEVELOPMENT.md          # Development workflow
```

## Configuration Overview

### Main Configuration (`.storybook/main.ts`)

The main configuration file defines:

- **Stories location**: `components/**/*.stories.@(js|jsx|ts|tsx)`
- **Addons**:
  - `@storybook/addon-essentials` - Core functionality (docs, controls, actions, etc.)
  - `@storybook/addon-interactions` - Testing user interactions
  - `@storybook/addon-a11y` - Accessibility checks
  - `@storybook/addon-themes` - Dark mode toggle
- **Framework**: `@storybook/nextjs` for Next.js 15 compatibility
- **Path aliases**: `@/` mapped to project root
- **Static assets**: `/public` folder available at `/fonts`, `/images`, etc.

### Preview Configuration (`.storybook/preview.tsx`)

The preview configuration includes:

- **Global styles**: Imports `app/globals.css` for Tailwind and CSS variables
- **Font loading**: Geist Sans and Geist Mono from `/public/fonts`
- **Decorators**:
  - Material-UI Emotion cache
  - University theme switcher (mint, blue, purple presets)
  - Dark mode toggle
- **Parameters**:
  - Default layout: centered
  - Background options: light, dark, mint-tint
  - Viewport presets: mobile, tablet, desktop
  - Auto-detect `on*` event handlers

## Toolbar Controls

### Dark Mode Toggle

Click the moon/sun icon in the toolbar to toggle between light and dark modes.

This applies the `.dark` class to the root element, triggering Tailwind's dark mode variants.

### University Theme Switcher

Select a university theme from the "University Theme" dropdown:

- **STU Mint (Default)** - Original mint green (#37DBC3)
- **Custom Blue** - Blue primary (#3B82F6)
- **Custom Purple** - Purple primary (#A855F7)

This updates CSS variables (`--primary`, `--accent`, etc.) to simulate different university branding.

## Troubleshooting

### Port Already in Use

If port 6006 is already in use:

```bash
pnpm storybook -- -p 6007
```

Or kill the existing process:

```bash
lsof -ti:6006 | xargs kill -9
```

### Tailwind Styles Not Loading

**Symptom**: Components appear unstyled, Tailwind classes don't work

**Solution**:
1. Verify `.storybook/postcss.config.mjs` exists with `@tailwindcss/postcss` plugin
2. Check that `app/globals.css` is imported in `.storybook/preview.tsx`
3. Restart Storybook: `Ctrl+C` and `pnpm storybook`

### TypeScript Errors in Stories

**Symptom**: Red squiggly lines in story files

**Solution**:
1. Ensure `.storybook/` is included in `tsconfig.json` `include` array
2. Run `pnpm install` to ensure all type definitions are installed
3. Restart TypeScript server in your editor

### Fonts Not Loading

**Symptom**: Text appears in fallback system fonts instead of Geist Sans/Mono

**Solution**:
1. Verify font files exist in `app/fonts/`:
   - `Geist-Variable.woff2`
   - `GeistMono-Variable.woff2`
2. Check that `staticDirs: ["../public"]` is configured in `.storybook/main.ts`
3. If fonts are in `app/fonts/` instead of `public/fonts/`, create symlinks:
   ```bash
   mkdir -p public/fonts
   ln -s ../../app/fonts/Geist-Variable.woff2 public/fonts/
   ln -s ../../app/fonts/GeistMono-Variable.woff2 public/fonts/
   ```

### Material-UI Components Look Broken

**Symptom**: MUI components have incorrect spacing or styles

**Solution**:
1. Verify `withMuiTheme` decorator is registered in `.storybook/preview.tsx`
2. Check that decorators are in correct order (MUI should come first)
3. Restart Storybook

### React 19 Peer Dependency Warnings

**Symptom**: pnpm shows peer dependency warnings during install

**Solution**: This is expected and handled via `pnpm.overrides` in `package.json`. The warnings are safe to ignore.

### Stories Not Appearing

**Symptom**: Storybook loads but no stories show up

**Solution**:
1. Check that story files match the pattern in `.storybook/main.ts`: `components/**/*.stories.@(js|jsx|ts|tsx)`
2. Ensure story files export a `default` meta object and at least one named export
3. Check browser console for import errors
4. Try clearing Storybook cache:
   ```bash
   rm -rf node_modules/.cache/storybook
   pnpm storybook
   ```

## Environment Variables

Storybook runs in a browser environment and only has access to `NEXT_PUBLIC_*` environment variables.

To use environment variables in stories:

1. Prefix with `NEXT_PUBLIC_` in `.env.local`
2. Access via `process.env.NEXT_PUBLIC_YOUR_VAR`

**Note**: Database environment variables (`SUPABASE_DEV_URL`, etc.) are NOT available in Storybook. Use mock data instead.

## Next Steps

- Read [WRITING_STORIES.md](./WRITING_STORIES.md) to learn how to create stories
- Read [COMPONENT_DEVELOPMENT.md](./COMPONENT_DEVELOPMENT.md) for the development workflow
- Explore the example stories in `components/ui/*.stories.tsx`
