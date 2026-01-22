/**
 * Shared style utilities for grad-planner components
 * Re-exports color utilities from progress-overview for consistency
 */

// Re-export color utilities from progress-overview
export {
  getCompletedColor,
  getInProgressColor,
  getPlannedColor,
  getPlannedColorDark,
  getCompletedCardBg,
  getCompletedCardBorder,
  getInProgressCardBg,
  getInProgressCardBorder,
} from '@/components/progress-overview/colorUtils';

/**
 * Category color mapping consistent with progress-overview
 * These colors are used to visually distinguish different requirement types
 */
export const CATEGORY_COLORS: Record<string, string> = {
  // Major/Program requirements
  major: '#12F987', // var(--primary) - bright mint green
  minor: '#003D82', // navy blue

  // General Education
  'general education': '#2196f3', // blue
  'gen ed': '#2196f3',
  ge: '#2196f3',

  // Religion
  religion: '#5E35B1', // indigo/purple
  rel: '#5E35B1',

  // Electives
  electives: '#9C27B0', // magenta/pink
  elective: '#9C27B0',
} as const;

/**
 * Get the category color from a course's fulfills array
 * Checks each fulfills requirement against known category patterns
 *
 * @param fulfills - Array of requirement strings the course fulfills
 * @returns The category color or a fallback grey
 */
export function getCategoryColorFromFulfills(fulfills: string[]): string {
  if (!fulfills || fulfills.length === 0) {
    return '#6b7280'; // fallback gray (zinc-500)
  }

  for (const req of fulfills) {
    const normalized = req.toLowerCase().trim();

    // Check each category pattern
    for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
      if (normalized.includes(key)) {
        return color;
      }
    }
  }

  return '#6b7280'; // fallback gray
}

/**
 * Common card styling classes used across grad-planner components
 */
export const cardStyles = {
  // Main card container
  container:
    'rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm',

  // Hover effect for interactive cards
  hover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',

  // Nested card container (smaller radius)
  nested:
    'rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm',
} as const;

/**
 * Common typography classes
 */
export const typographyStyles = {
  // Section labels
  label: 'text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]',

  // Card titles
  title: 'text-xl font-black text-[var(--foreground)]',

  // Large values/stats
  value: 'text-3xl font-black text-[var(--foreground)]',

  // Small values
  valueSmall: 'text-lg font-bold text-[var(--foreground)]',
} as const;
