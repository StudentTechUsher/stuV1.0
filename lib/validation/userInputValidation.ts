/**
 * Validation utilities for user-submitted content
 */

/**
 * Validates and sanitizes user-submitted text entries for interests and career options
 * @param input - Raw user input string
 * @returns Object with isValid boolean and sanitized string
 */
export function validateAndSanitizeUserEntry(input: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  // Trim whitespace
  const trimmed = input.trim();

  // Check minimum length
  if (trimmed.length < 2) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Entry must be at least 2 characters long',
    };
  }

  // Check maximum length
  if (trimmed.length > 100) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Entry must be less than 100 characters',
    };
  }

  // Check for potentially malicious patterns
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<\/?\w+/i, // HTML tags
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Invalid characters or patterns detected',
      };
    }
  }

  // Capitalize first letter of each word
  const sanitized = trimmed
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Check if an entry already exists in the options list (case-insensitive)
 */
export function entryExists(entry: string, existingOptions: { name: string }[]): boolean {
  const normalized = entry.trim().toLowerCase();
  return existingOptions.some((opt) => opt.name.toLowerCase() === normalized);
}
