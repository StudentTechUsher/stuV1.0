// lib/logger.ts
// FERPA-compliant logging utility
// Ensures no PII (Personally Identifiable Information) is logged

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;      // Will be hashed automatically
  action?: string;      // e.g., 'transcript_upload', 'course_parse'
  errorCode?: string;   // Database error codes (safe)
  errorType?: string;   // Error class names (safe)
  errorHint?: string;   // Database hints (safe)
  count?: number;       // Counts (safe)
  duration?: number;    // Timing in ms (safe)
  status?: string;      // Status transitions (safe)
  httpStatus?: number;  // HTTP status codes (safe)
  startDate?: string;   // ISO timestamps are safe
  endDate?: string;     // ISO timestamps are safe
  model?: string;       // AI model name (safe)
  textLength?: number;  // Text/content length in characters (safe)
  // NEVER include: student data, course info, grades, names, emails, file content
}

/**
 * Hash user ID for logging - allows correlation without exposing actual ID
 * Uses a simple hash function compatible with ES2017.
 */
function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Sanitize error objects to remove potential PII
 */
function sanitizeError(error: unknown): { type: string; message?: string; code?: string } {
  if (error instanceof Error) {
    return {
      type: error.constructor.name,
      message: error.message,
      code: (error as Error & { code?: string }).code, // Database errors often have codes
    };
  }
  return {
    type: 'Unknown',
    message: String(error),
  };
}

/**
 * FERPA-compliant logging function
 * Automatically hashes user IDs and sanitizes context
 */
export function logSecure(level: LogLevel, message: string, context?: LogContext) {
  const sanitized: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Hash user ID if present
  if (context?.userId) {
    sanitized.userIdHash = hashUserId(context.userId);
    delete sanitized.userId; // Remove plaintext
  }

  const logFn = console[level];
  logFn(`[${sanitized.timestamp}] ${message}`, sanitized);
}

/**
 * Log error with automatic sanitization
 */
export function logError(message: string, error: unknown, context?: Omit<LogContext, 'errorType' | 'errorCode'>) {
  const sanitizedError = sanitizeError(error);

  logSecure('error', message, {
    ...context,
    errorType: sanitizedError.type,
    errorCode: sanitizedError.code,
    // Only include safe parts of error message
    ...(sanitizedError.message && !containsPII(sanitizedError.message)
      ? { errorMessage: sanitizedError.message }
      : {}
    ),
  });
}

/**
 * Basic PII detection (not exhaustive, but catches common cases)
 */
function containsPII(text: string): boolean {
  // Check for email patterns
  if (/@/.test(text)) return true;

  // Check for potential student data patterns (grades, course codes)
  if (/grade|GPA|student|transcript/i.test(text)) return true;

  // Check for potential names (Title Case Words)
  const titleCasePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/;
  if (titleCasePattern.test(text)) return true;

  return false;
}

/**
 * Log info-level message
 */
export function logInfo(message: string, context?: LogContext) {
  logSecure('info', message, context);
}

/**
 * Log warning-level message
 */
export function logWarn(message: string, context?: LogContext) {
  logSecure('warn', message, context);
}
