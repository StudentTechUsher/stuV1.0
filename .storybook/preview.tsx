import type { Preview } from '@storybook/react';
// import { withThemeByClassName } from '@storybook/addon-themes'; // TODO: Need v10 addon
import { withUniversityTheme } from './decorators/theme-decorator';
import { withMuiTheme } from './decorators/mui-decorator';
import '../app/globals.css';

// Font configuration (replicate from layout.tsx)
// Note: In Storybook, we reference the fonts from the staticDirs
const fontStyles = `
  @font-face {
    font-family: 'Geist Sans';
    src: url('/fonts/Geist-Variable.woff2') format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Geist Mono';
    src: url('/fonts/GeistMono-Variable.woff2') format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  :root {
    --font-geist-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-geist-mono: 'Geist Mono', 'Courier New', monospace;
  }

  body {
    font-family: var(--font-geist-sans);
  }
`;

// Inject font styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fontStyles;
  document.head.appendChild(style);
}

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a1f1a' },
        { name: 'mint-tint', value: '#f0fdf9' },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
  globalTypes: {
    universityTheme: {
      description: 'University theme color preset',
      defaultValue: 'STU Mint (Default)',
      toolbar: {
        title: 'University Theme',
        icon: 'paintbrush',
        items: [
          { value: 'STU Mint (Default)', title: 'STU Mint (Default)' },
          { value: 'Custom Blue', title: 'Custom Blue' },
          { value: 'Custom Purple', title: 'Custom Purple' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    withMuiTheme,
    withUniversityTheme,
    // TODO: Re-enable when addon-themes v10 is available
    // withThemeByClassName({
    //   themes: {
    //     light: '',
    //     dark: 'dark',
    //   },
    //   defaultTheme: 'light',
    //   }),
  ],
};

export default preview;
