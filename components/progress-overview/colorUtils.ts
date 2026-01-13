// Centralized color utilities for consistent theming across all progress components

/**
 * Returns the color for completed status
 * Uses solid category color
 */
export function getCompletedColor(categoryColor: string): string {
  return categoryColor;
}

/**
 * Returns the color for in-progress status
 * Uses 50% transparent category color
 */
export function getInProgressColor(categoryColor: string): string {
  return `color-mix(in srgb, ${categoryColor} 50%, transparent)`;
}

/**
 * Returns the color for planned status
 * Uses consistent grey
 */
export function getPlannedColor(): string {
  return 'rgb(212 212 216)'; // zinc-300
}

/**
 * Returns the dark mode color for planned status
 */
export function getPlannedColorDark(): string {
  return 'rgb(82 82 91)'; // zinc-600
}

/**
 * Returns the background color for completed course cards
 * Same solid color as the badge in the key
 */
export function getCompletedCardBg(categoryColor: string): string {
  return categoryColor; // Solid bright color - same as badge
}

/**
 * Returns the border color for completed course cards
 */
export function getCompletedCardBorder(categoryColor: string): string {
  return categoryColor;
}

/**
 * Returns the background color for in-progress course cards
 * Same 50% transparent as the badge in the key
 */
export function getInProgressCardBg(categoryColor: string): string {
  return `color-mix(in srgb, ${categoryColor} 50%, transparent)`;
}

/**
 * Returns the border color for in-progress course cards
 */
export function getInProgressCardBorder(categoryColor: string): string {
  return `color-mix(in srgb, ${categoryColor} 50%, transparent)`;
}
