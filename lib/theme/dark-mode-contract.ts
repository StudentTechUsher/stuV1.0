export const DARK_MODE_STORAGE_KEY = 'stu-theme-mode' as const;
export const COLOR_MODE_GLOBAL = 'colorMode' as const;

export const REQUIRED_DARK_TOKENS = {
  '--background': '#23262f',
  '--foreground': '#e6e8ee',
  '--card': '#2a2f39',
  '--popover': '#2a2f39',
  '--muted': '#343a46',
  '--border': '#3d4453',
  '--ring': '#12F987',
  '--primary': '#12F987',
} as const;

export const MUI_DARK_PALETTE_EXPECTATIONS = {
  background: {
    default: '#23262f',
    paper: '#2a2f39',
  },
  text: {
    primary: '#e6e8ee',
    secondary: '#b7becc',
  },
  divider: '#3d4453',
  primary: {
    main: '#12F987',
  },
} as const;

export const DARK_MODE_VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1440, height: 900 },
} as const;
