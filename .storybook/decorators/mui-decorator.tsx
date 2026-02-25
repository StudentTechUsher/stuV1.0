import type { Decorator } from '@storybook/react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { COLOR_MODE_GLOBAL, MUI_DARK_PALETTE_EXPECTATIONS } from '@/lib/theme/dark-mode-contract';

// Create Emotion cache for Material-UI
const cache = createCache({
  key: 'storybook-mui',
  prepend: true,
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#12F987' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#0a1f1a', secondary: '#71717a' },
    divider: '#e4e4e7',
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: MUI_DARK_PALETTE_EXPECTATIONS.primary.main },
    background: {
      default: MUI_DARK_PALETTE_EXPECTATIONS.background.default,
      paper: MUI_DARK_PALETTE_EXPECTATIONS.background.paper,
    },
    text: {
      primary: MUI_DARK_PALETTE_EXPECTATIONS.text.primary,
      secondary: MUI_DARK_PALETTE_EXPECTATIONS.text.secondary,
    },
    divider: MUI_DARK_PALETTE_EXPECTATIONS.divider,
  },
});

export const withMuiTheme: Decorator = (Story, context) => {
  const isDark = context.globals[COLOR_MODE_GLOBAL] === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    </CacheProvider>
  );
};
