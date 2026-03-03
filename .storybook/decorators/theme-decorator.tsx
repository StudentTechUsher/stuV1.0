import type { Decorator } from '@storybook/react';
import { useEffect } from 'react';

// University theme presets for Storybook
const UNIVERSITY_THEMES = {
  'STU Mint (Default)': {
    primary: '#37DBC3',
    accent: '#FF6B6B',
  },
  'Custom Blue': {
    primary: '#3B82F6',
    accent: '#F59E0B',
  },
  'Custom Purple': {
    primary: '#A855F7',
    accent: '#EC4899',
  },
} as const;

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : { r: 0, g: 0, b: 0 };
}

const ThemeManager = ({ themeName }: { themeName: string }) => {
  const theme = UNIVERSITY_THEMES[themeName as keyof typeof UNIVERSITY_THEMES];

  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;

    // Apply primary color
    const primaryRgb = hexToRgb(theme.primary);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--primary-15', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15)`);
    root.style.setProperty('--primary-22', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.22)`);

    // Apply accent color
    const accentRgb = hexToRgb(theme.accent);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--accent-15', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);
    root.style.setProperty('--accent-22', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.22)`);

  }, [theme]);

  return null;
};

export const withUniversityTheme: Decorator = (Story, context) => {
  const themeName = context.globals.universityTheme || 'STU Mint (Default)';

  return (
    <>
      <ThemeManager themeName={themeName} />
      <Story />
    </>
  );
};
