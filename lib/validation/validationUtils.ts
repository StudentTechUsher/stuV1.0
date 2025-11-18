import { ZodError, ZodSchema } from 'zod';

/**
 * Custom error class for validation failures
 * Provides structured error details for API responses
 */
export class ValidationError extends Error {
  public readonly issues: ValidationIssue[];
  public readonly status = 400;

  constructor(issues: ValidationIssue[], message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/**
 * Structured validation issue for API responses
 */
export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

/**
 * Converts Zod validation error to structured issues
 * @param error - Zod validation error
 * @returns Array of structured validation issues
 */
function zodErrorToIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : 'root',
    code: issue.code,
    message: issue.message,
  }));
}

/**
 * Validates data against a Zod schema
 * Throws ValidationError on failure with structured issues
 *
 * @example
 * const input = validateRequest(SignupSchema, requestBody);
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and parsed data (fully typed)
 * @throws ValidationError if validation fails
 */
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = zodErrorToIssues(result.error);
    throw new ValidationError(issues);
  }

  return result.data;
}

/**
 * Formats validation error for API response
 *
 * @example
 * catch (error) {
 *   if (error instanceof ValidationError) {
 *     return NextResponse.json(formatValidationError(error), { status: 400 });
 *   }
 * }
 *
 * @param error - ValidationError instance
 * @returns Formatted error response object
 */
export function formatValidationError(error: ValidationError) {
  return {
    ok: false,
    error: 'invalid_input',
    issues: error.issues,
  };
}

/**
 * Type-safe version of validateRequest for use in API routes
 * Automatically formats error responses
 *
 * @example
 * const input = await validateRequestAsync(SignupSchema, await request.json());
 */
export async function validateRequestAsync<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<T> {
  return validateRequest(schema, data);
}
