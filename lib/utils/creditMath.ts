import { CourseRow } from '@/types/schedule';

/**
 * Calculate total credits from an array of course rows
 */
export function calculateTotalCredits(rows: CourseRow[]): number {
  return rows.reduce((sum, row) => sum + row.credits, 0);
}

/**
 * Calculate average schedule difficulty from course rows
 * Returns undefined if no difficulty data is available
 */
export function calculateScheduleDifficulty(rows: CourseRow[]): number | undefined {
  const rowsWithDifficulty = rows.filter(row => row.difficulty != null);

  if (rowsWithDifficulty.length === 0) {
    return undefined;
  }

  const sum = rowsWithDifficulty.reduce((acc, row) => acc + (row.difficulty || 0), 0);
  return Math.round((sum / rowsWithDifficulty.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Format credits for display (e.g., "14.0 credit hours")
 */
export function formatCredits(credits: number): string {
  return credits.toFixed(1);
}

/**
 * Format difficulty score for display (e.g., "3.2/5" or "—/5")
 */
export function formatDifficulty(difficulty?: number): string {
  if (difficulty == null) {
    return '—/5';
  }
  return `${difficulty.toFixed(1)}/5`;
}

/**
 * Format instructor rating for display (e.g., "4.2/5" or "—")
 */
export function formatRating(rating?: number): string {
  if (rating == null) {
    return '—';
  }
  return `${rating.toFixed(1)}/5`;
}
