# Zod Input Validation Guide

**Date**: 2025-11-13
**Status**: ✅ Complete and Tested
**Tests**: 74 passing (100%)

---

## Overview

Zod input validation has been added to key API endpoints to ensure type-safe request handling. Request data is validated before processing, with standardized error responses on failure.

---

## What's New

### Installed Dependency
- **zod** - Schema validation library (latest version)

### New Files Created

#### Validation Utilities
- `lib/validation/zodSchemas.ts` - Zod schema definitions
- `lib/validation/validationUtils.ts` - Validation helpers and error handling

#### Tests
- `tests/validation/zodSchemas.test.ts` - Schema validation tests (47 tests)
- `tests/validation/validationUtils.test.ts` - Utility function tests (27 tests)

### Modified Endpoints

- `app/api/onboarding/complete/route.ts` - User onboarding validation
- `app/api/plans/[planId]/name/route.ts` - Plan name update validation
- `app/api/plan-courses/[planId]/[courseCode]/goal-grade/route.ts` - Goal grade validation

---

## Validation Schemas

### OnboardingSchema

Validates user profile completion after signup. Required when `role === 'student'`, graduation fields are optional for other roles.

```typescript
{
  university_id: number              // Positive integer (required)
  email: string                      // Valid email, max 254 chars
  role: 'student' | 'advisor' | 'admin'  // User role (required)
  fname?: string                     // First name, 1-100 chars, trimmed
  lname?: string                     // Last name, 1-100 chars, trimmed
  est_grad_sem?: string              // Graduation semester (required if student)
  est_grad_date?: string             // Graduation date (required if student)
}
```

**Example:**
```typescript
const data = await request.json();
const validated = validateRequest(OnboardingSchema, data);
// validated: OnboardingInput
```

### UpdatePlanNameSchema

Validates graduation plan name updates.

```typescript
{
  name: string                       // 1-255 characters, trimmed
}
```

**Example:**
```typescript
const validated = validateRequest(UpdatePlanNameSchema, { name: 'My Plan' });
```

### UpdateGoalGradeSchema

Validates course goal grade values.

```typescript
{
  goalGrade: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'E' | null
}
```

**Example:**
```typescript
const validated = validateRequest(UpdateGoalGradeSchema, { goalGrade: 'A' });
```

### GradPlanEditSchema

Validates graduation plan edit operations. Uses discriminated union for type safety.

```typescript
{
  planId: string                     // UUID or opaque ID string
  operations: Array<                 // At least 1 operation required
    | { op: 'addCourse', courseId: string, termCode: string }
    | { op: 'removeCourse', courseId: string }
    | { op: 'moveCourse', courseId: string, fromTerm: string, toTerm: string }
    | { op: 'setAttr', key: string, value: string | number | boolean | null }
  >
  version?: string                   // Optional concurrency control
  actorUserId?: string               // Optional actor information
}
```

**Example:**
```typescript
const validated = validateRequest(GradPlanEditSchema, {
  planId: 'plan-123',
  operations: [
    { op: 'addCourse', courseId: 'MATH-101', termCode: 'SP2024' },
    { op: 'removeCourse', courseId: 'PHYS-101' }
  ]
});
```

---

## Validation Utilities

### `validateRequest<T>(schema, data): T`

Validates data against a Zod schema and returns parsed data or throws `ValidationError`.

```typescript
import { validateRequest } from '@/lib/validation/validationUtils';
import { OnboardingSchema } from '@/lib/validation/zodSchemas';

try {
  const validated = validateRequest(OnboardingSchema, requestBody);
  // validated is fully typed and safe to use
  await completeOnboarding(validated);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  }
  throw error;
}
```

### `ValidationError`

Custom error class containing structured validation issues.

**Properties:**
- `issues: ValidationIssue[]` - Array of validation problems
- `message: string` - Error message
- `status: 400` - HTTP status code
- `name: 'ValidationError'` - Error type identifier

**Example:**
```typescript
try {
  validateRequest(MySchema, data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.issues);
    // [{ path: 'email', code: 'invalid_string', message: '...' }]
  }
}
```

### `formatValidationError(error): FormattedError`

Converts a `ValidationError` to an API response format.

```typescript
return NextResponse.json(formatValidationError(error), { status: 400 });
// Returns:
// {
//   "ok": false,
//   "error": "invalid_input",
//   "issues": [...]
// }
```

---

## Error Response Format

### Validation Error (400)

```json
{
  "ok": false,
  "error": "invalid_input",
  "issues": [
    {
      "path": "email",
      "code": "invalid_string",
      "message": "Invalid email"
    },
    {
      "path": "password",
      "code": "too_small",
      "message": "String must contain at least 8 character(s)"
    }
  ]
}
```

### Success Response (200)

```json
{
  "ok": true,
  "data": { /* endpoint-specific data */ }
}
```

### Server Error (500)

```json
{
  "error": "Internal server error"
}
```

### Common Error Codes

- `invalid_format` - Invalid format (e.g., invalid email)
- `invalid_string` - String validation failed
- `invalid_type` - Wrong data type
- `too_small` - String/array too short
- `too_big` - String/array too long
- `invalid_enum` - Value not in allowed enum

---

## API Endpoints

### POST `/api/onboarding/complete`

**Request:**
```json
{
  "university_id": 1,
  "email": "student@university.edu",
  "role": "student",
  "fname": "John",
  "lname": "Doe",
  "est_grad_sem": "Spring 2025",
  "est_grad_date": "2025-05-15"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

**Validation Error (400):**
```json
{
  "ok": false,
  "error": "invalid_input",
  "issues": [
    {
      "path": "est_grad_sem",
      "code": "invalid_type",
      "message": "Graduation semester and date are required for student role"
    }
  ]
}
```

---

### PUT `/api/plans/[planId]/name`

**Request:**
```json
{
  "name": "My Updated Plan"
}
```

**Success Response (200):**
```json
{
  "name": "My Updated Plan"
}
```

**Validation Error (400):**
```json
{
  "ok": false,
  "error": "invalid_input",
  "issues": [
    {
      "path": "name",
      "code": "too_small",
      "message": "Plan name cannot be empty"
    }
  ]
}
```

---

### POST `/api/plan-courses/[planId]/[courseCode]/goal-grade`

**Request:**
```json
{
  "goalGrade": "A"
}
```

**Success Response (200):**
```json
{
  "goalGrade": "A"
}
```

**Validation Error (400):**
```json
{
  "ok": false,
  "error": "invalid_input",
  "issues": [
    {
      "path": "goalGrade",
      "code": "invalid_enum",
      "message": "Goal grade must be one of: A, A-, B+, B, B-, C+, C, C-, D+, D, E"
    }
  ]
}
```

---

## How to Use in New Endpoints

### Step 1: Create a Schema

```typescript
// lib/validation/zodSchemas.ts
import { z } from 'zod';

/**
 * AUTHORIZATION: STUDENTS_AND_ABOVE
 * Schema for updating course prerequisites
 */
export const UpdateCoursePrereqSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  prerequisiteIds: z
    .array(z.string())
    .min(0)
    .max(10, 'Maximum 10 prerequisites allowed'),
  notes: z.string().max(500).optional(),
});

export type UpdateCoursePrereqInput = z.infer<typeof UpdateCoursePrereqSchema>;
```

### Step 2: Wire Into Your Endpoint

```typescript
// app/api/courses/[courseId]/prerequisites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UpdateCoursePrereqSchema } from '@/lib/validation/zodSchemas';
import { validateRequest, ValidationError, formatValidationError } from '@/lib/validation/validationUtils';
import { updateCoursePrerequisites } from '@/lib/services/courseService';

async function handleUpdatePrerequisites(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validated = validateRequest(UpdateCoursePrereqSchema, body);

    // Use validated data with service layer
    const result = await updateCoursePrerequisites(validated);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(formatValidationError(error), { status: 400 });
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleUpdatePrerequisites(request);
}
```

### Step 3: Write Tests

```typescript
// tests/validation/zodSchemas.test.ts
import { describe, it, expect } from 'vitest';
import { UpdateCoursePrereqSchema } from '@/lib/validation/zodSchemas';

describe('UpdateCoursePrereqSchema', () => {
  it('should validate valid prerequisites', () => {
    const result = UpdateCoursePrereqSchema.safeParse({
      courseId: 'MATH-101',
      prerequisiteIds: ['MATH-100', 'COMP-101'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject too many prerequisites', () => {
    const result = UpdateCoursePrereqSchema.safeParse({
      courseId: 'MATH-101',
      prerequisiteIds: Array.from({ length: 11 }, (_, i) => `COURSE-${i}`),
    });
    expect(result.success).toBe(false);
  });
});
```

---

## Best Practices

### ✅ Do This

- Validate immediately after parsing request body
- Use `z.infer<>` to derive types from schemas
- Catch and handle `ValidationError` explicitly
- Return formatted validation errors with 400 status
- Reuse schemas across endpoints
- Write tests for all valid and invalid cases
- Include JSDoc comments with `@AUTHORIZATION` level
- Use custom error messages in schema definitions
- Test edge cases (whitespace, boundaries, type coercion)

### ❌ Don't Do This

- Use generic error messages that hide validation details
- Validate deep inside business logic
- Catch all errors the same way
- Ignore validation errors silently
- Duplicate validation logic instead of reusing schemas
- Skip error handling for edge cases
- Use `any` type in validation utilities
- Validate in both client and server inconsistently
- Ignore TypeScript errors in validation code

---

## Testing

### Run Validation Tests

```bash
# Run all validation tests
npm test -- tests/validation/

# Run specific test file
npm test -- tests/validation/zodSchemas.test.ts

# Run with coverage
npm test -- --coverage tests/validation/

# Watch mode
npm test -- --watch tests/validation/
```

### Test Coverage

**Schema Tests (47 tests):**
- OnboardingSchema: 11 tests (valid profiles, invalid emails, conditional fields)
- UpdatePlanNameSchema: 8 tests (valid names, length boundaries, type coercion)
- UpdateGoalGradeSchema: 9 tests (all valid grades, invalid formats, null handling)
- GradPlanEditSchema: 19 tests (all operation types, nested validation, edge cases)

**Utility Tests (27 tests):**
- ValidationError class: 5 tests (creation, properties, inheritance)
- validateRequest function: 12 tests (valid data, errors, nested paths, coercion)
- formatValidationError function: 7 tests (formatting, structure, ordering)
- Error message handling: 3 tests (custom messages, issue capture)

**Result**: ✅ 74/74 tests passing

---

## Migration Guide

### Migrating from Manual Validation

**Before:**
```typescript
if (!body.email || typeof body.email !== 'string') {
  return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
}
if (!emailRegex.test(body.email)) {
  return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
}
```

**After:**
```typescript
const validated = validateRequest(UpdatePlanNameSchema, body);
// Single line, type-safe, comprehensive error reporting
```

### Migrating from Yup to Zod

Both libraries have similar patterns. Existing Yup validation in the codebase remains unchanged for backward compatibility.

**Yup Example:**
```typescript
const schema = yup.object({
  email: yup.string().email().required(),
});
const validated = await schema.validate(data);
```

**Zod Example:**
```typescript
const schema = z.object({
  email: z.string().email(),
});
const validated = validateRequest(schema, data);
```

Key differences:
- Zod uses `safeParse()` instead of throwing for errors (we handle this in `validateRequest`)
- Zod supports discriminated unions natively (useful for operations like `GradPlanEditSchema`)
- Zod has better TypeScript integration with `z.infer<>`

---

## Scope Compliance

✅ **CLAUDE.md Compliance**
- No `any` types used
- Proper error classes for validation failures
- Clear error handling patterns
- JSDoc comments with authorization levels on all schemas

✅ **Scope Constraints**
- No modifications to `grad-planner/**` paths
- No modifications to `grad-map/**` paths
- Service layer unchanged
- Database schema unchanged
- Only API layer modified

✅ **Code Quality**
- TypeScript strict mode compliant
- ESLint passing on all new files
- 100% test coverage for schema definitions
- Comprehensive error messages

---

## Summary

| Item | Status | Details |
|------|--------|---------|
| Zod Installation | ✅ | Latest version installed |
| Schema Files | ✅ | 2 files (4 schemas total) |
| Validation Utilities | ✅ | Error handling, formatting |
| Endpoint Integration | ✅ | 3 endpoints updated |
| Test Coverage | ✅ | 74 tests (100% passing) |
| Documentation | ✅ | Complete with examples |
| Scope Compliance | ✅ | No forbidden paths modified |
| Type Safety | ✅ | No `any` types |
| Production Ready | ✅ | Ready for deployment |

---

## Troubleshooting

### "ValidationError is not being caught"

Ensure you're importing from the correct module:
```typescript
// ✅ Correct
import { ValidationError } from '@/lib/validation/validationUtils';

// ❌ Wrong (this is Zod's internal error)
import { ValidationError } from 'zod';
```

### "Schema validation passes but data is invalid later"

Add more specific refinements to your schema:
```typescript
// Before
const schema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// After - with date validation
const schema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);
```

### "Type inference not working for validated data"

Always use the `Input` type export:
```typescript
// ✅ Correct
import type { UpdatePlanNameInput } from '@/lib/validation/zodSchemas';
const validated: UpdatePlanNameInput = validateRequest(UpdatePlanNameSchema, data);

// Also works - inferring from schema
type ValidatedData = z.infer<typeof UpdatePlanNameSchema>;
```

---

## Related Files

- **Schemas**: `lib/validation/zodSchemas.ts`
- **Utilities**: `lib/validation/validationUtils.ts`
- **Tests**: `tests/validation/zodSchemas.test.ts`, `tests/validation/validationUtils.test.ts`
- **Service Layer**: `lib/services/`
- **Logger**: `lib/logger.ts`

---

## Questions or Issues?

1. Check the test files for usage examples: `tests/validation/`
2. Review endpoint implementations: `app/api/onboarding/`, `app/api/plans/`, `app/api/plan-courses/`
3. Consult Zod documentation: https://zod.dev

---

**Last Updated**: 2025-11-13
**Version**: 1.0
**Status**: Production Ready
