/**
 * Design constants for Grad Plan Redesign
 * These constants ensure visual consistency with the Progress Overview component
 */

// Course status colors - matching Progress Overview design principles
export const STATUS_COLORS = {
  completed: {
    bg: 'var(--primary)', // Solid bright green
    bgDark: 'var(--primary)',
    text: 'text-black',
  },
  'in-progress': {
    bg: 'color-mix(in srgb, var(--primary) 50%, transparent)', // 50% transparent green
    bgDark: 'color-mix(in srgb, var(--primary) 50%, transparent)',
    text: 'text-[var(--foreground)]',
  },
  planned: {
    bg: 'rgb(212 212 216)', // zinc-300
    bgDark: 'rgb(82 82 91)', // zinc-600
    text: 'text-[var(--foreground)]',
  },
  remaining: {
    bg: 'white',
    bgDark: 'rgb(39 39 42)', // zinc-800
    text: 'text-zinc-500 dark:text-zinc-400',
    border: 'rgb(228 228 231)', // zinc-200
    borderDark: 'rgb(63 63 70)', // zinc-700
  },
};

// Requirement category colors (from Progress Overview)
// These colors match the Progress Overview component for consistency
export const REQUIREMENT_COLORS: Record<string, string> = {
  'Major': 'var(--primary)', // Green
  'Minor': '#003D82', // Medium blue
  'General Education': '#2196f3', // Blue
  'GE': '#2196f3', // Blue (shorthand)
  'Religion': '#5E35B1', // Indigo
  'Electives': '#9C27B0', // Magenta
  'Finance Core': 'var(--primary)', // Green (treated as Major)
  'Life Sciences': '#2196f3', // Blue (treated as GE)
  'Foundations': '#2196f3', // Blue (treated as GE)
  'Social Sciences': '#2196f3', // Blue (treated as GE)
  'Civilization': '#2196f3', // Blue (treated as GE)
  'Arts & Letters': '#2196f3', // Blue (treated as GE)
};

// Event type colors (existing from current implementation)
export const EVENT_COLORS: Record<string, string> = {
  'internship': '#9C27B0', // Magenta
  'major-application': '#ff9800', // Orange
  'study-abroad': '#2196F3', // Blue
  'research': '#4CAF50', // Green
  'teaching-assistant': '#F44336', // Red
  'co-op': '#795548', // Brown
  'sabbatical': '#00BCD4', // Cyan
  'grad-school': '#673AB7', // Deep purple
  'graduation': '#1976D2', // Dark blue
};

// Typography constants
export const TYPOGRAPHY = {
  header: {
    size: 'text-4xl',
    weight: 'font-black',
    tracking: 'tracking-tight',
  },
  subheader: {
    size: 'text-2xl',
    weight: 'font-black',
    tracking: 'tracking-tight',
  },
  cardTitle: {
    size: 'text-lg',
    weight: 'font-bold',
    leading: 'leading-tight',
  },
  body: {
    size: 'text-sm',
    weight: 'font-semibold',
  },
  badge: {
    size: 'text-xs',
    weight: 'font-bold',
  },
};

// Spacing constants (matching Progress Overview)
export const SPACING = {
  cardPadding: 'p-6',
  cardPaddingLarge: 'p-8',
  cardPaddingXL: 'p-10',
  cardGap: 'gap-4',
  cardGapLarge: 'gap-6',
  sectionGap: 'gap-3',
};

// Border radius constants (matching Progress Overview)
export const BORDER_RADIUS = {
  card: 'rounded-2xl', // 16px
  element: 'rounded-xl', // 12px
  badge: 'rounded-full',
  button: 'rounded-lg',
};

// Shadow constants
export const SHADOWS = {
  card: 'shadow-sm',
  cardHover: 'hover:shadow-lg',
  cardSubtle: 'shadow-[0_42px_120px_-68px_rgba(8,35,24,0.55)]',
};

// Helper function to get requirement color with fallback
export function getRequirementColor(requirement: string): string {
  return REQUIREMENT_COLORS[requirement] || 'rgb(107 114 128)'; // zinc-500 fallback
}

// Helper function to get event color with fallback
export function getEventColor(eventType: string): string {
  return EVENT_COLORS[eventType] || '#9C27B0'; // Magenta fallback
}
