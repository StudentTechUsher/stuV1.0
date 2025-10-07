/**
 * Validates graduation plan names to prevent inappropriate content
 * Keeps validation reasonable - blocks obvious inappropriate terms but not overly restrictive
 */

const INAPPROPRIATE_TERMS = [
  // Explicit sexual terms
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'cock', 'pussy', 'cunt',
  'bastard', 'damn', 'whore', 'slut', 'porn', 'sex', 'xxx',
  // Hateful/offensive terms (basic list)
  'nazi', 'hitler', 'racist', 'nigger', 'fag', 'retard',
  // Keep it simple - these are the most obvious ones
];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a graduation plan name
 * @param name - The plan name to validate
 * @returns ValidationResult object with valid flag and optional error message
 */
export function validatePlanName(name: string): ValidationResult {
  // Check if name is empty or just whitespace
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Plan name cannot be empty',
    };
  }

  // Check length constraints (1-100 characters)
  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    return {
      valid: false,
      error: 'Plan name must be 100 characters or less',
    };
  }

  // Convert to lowercase for case-insensitive checking
  const lowerName = trimmedName.toLowerCase();

  // Check for inappropriate terms
  for (const term of INAPPROPRIATE_TERMS) {
    // Check if the term exists as a whole word (with word boundaries)
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lowerName)) {
      return {
        valid: false,
        error: 'Please choose a more appropriate name for your plan',
      };
    }
  }

  return {
    valid: true,
  };
}
