/**
 * Selection mode types and utilities for institution settings
 * Controls how students select courses during plan creation
 */

export type SelectionMode = 'AUTO' | 'MANUAL' | 'CHOICE';

export const SELECTION_MODES: SelectionMode[] = ['AUTO', 'MANUAL', 'CHOICE'] as const;

/**
 * Coerces a value to a valid SelectionMode, defaulting to MANUAL
 */
export function coerceSelectionMode(v?: string | null): SelectionMode {
  return v === 'AUTO' || v === 'CHOICE' ? v : 'MANUAL';
}

/**
 * Mode descriptions for UI display
 */
export const SELECTION_MODE_DESCRIPTIONS: Record<SelectionMode, string> = {
  AUTO: "Students pick major/minor; STU auto-selects all course options. Edits allowed after creation.",
  MANUAL: "Students choose among course options before creating a plan.",
  CHOICE: "Students pick AUTO or MANUAL during plan creation."
};
