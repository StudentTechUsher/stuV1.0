# Claude Code Guidelines

This document contains project-specific guidelines and preferences for Claude to follow when working on this codebase.

---

## Code Quality Standards

### 1. TypeScript Type Safety

**NEVER use the `any` type**

- ❌ **Bad:**
  ```typescript
  function processData(data: any) {
    return data.value;
  }
  ```

- ✅ **Good:**
  ```typescript
  interface DataInput {
    value: string;
  }

  function processData(data: DataInput) {
    return data.value;
  }
  ```

**Alternatives to `any`:**
- Use `unknown` when the type is truly unknown, then narrow it with type guards
- Define proper interfaces or types
- Use generics when appropriate
- Use `Record<string, unknown>` for object types
- Use utility types like `Partial<T>`, `Pick<T>`, etc.

**Example with `unknown`:**
```typescript
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', String(error));
  }
}
```

---

### 2. Database Operations - Service Layer Pattern

**ALL database transactions MUST be in service files**

When you encounter or need to write database operations:

1. **Check if a service file exists** in [`lib/services/`](lib/services/)
2. **Add the function to an existing service** if it fits the domain
3. **Create a new service file** if it's a new domain

**Service File Naming Convention:**
- `lib/services/{domain}Service.ts` - For domain-specific operations
- Examples: `gradPlanService.ts`, `programService.ts`, `profileService.ts`

**Service Function Pattern:**

```typescript
// lib/services/exampleService.ts
import { supabase } from '@/lib/supabase';

// Custom error types for better error handling
export class ExampleNotFoundError extends Error {
  constructor(message = 'Example not found') {
    super(message);
    this.name = 'ExampleNotFoundError';
  }
}

export class ExampleFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ExampleFetchError';
  }
}

/**
 * AUTHORIZATION: [Who can call this - e.g., "STUDENTS AND ABOVE", "ADVISORS ONLY"]
 * Brief description of what this function does
 * @param paramName - Description of parameter
 * @returns Description of return value
 */
export async function fetchExampleData(userId: string) {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // Check for specific error codes
    if (error.code === 'PGRST116') {
      throw new ExampleNotFoundError();
    }
    throw new ExampleFetchError('Failed to fetch example', error);
  }

  return data;
}
```

**Server Actions Pattern:**

If the service function needs to be called from a client component, wrap it in a server action:

```typescript
// lib/services/server-actions.ts
'use server';

import { fetchExampleData as _fetchExampleData } from './exampleService';

export async function fetchExampleDataAction(userId: string) {
  try {
    return await _fetchExampleData(userId);
  } catch (error) {
    if (error instanceof ExampleNotFoundError) {
      return { success: false, error: 'Not found' };
    }
    throw error;
  }
}
```

**❌ NEVER do database operations directly in:**
- API routes (unless simple read operations)
- React components
- Utility functions

**✅ ALWAYS:**
- Put database logic in service files
- Use proper TypeScript types (no `any`)
- Include JSDoc comments with authorization level
- Handle errors with custom error classes
- Return typed data or throw typed errors

---

## Example Refactoring

**❌ Bad - Database logic in API route:**
```typescript
// app/api/users/route.ts
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}
```

**✅ Good - Database logic in service:**
```typescript
// lib/services/userService.ts
export class UserFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'UserFetchError';
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Fetches all active users
 * @returns Array of active users
 */
export async function fetchActiveUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('active', true);

  if (error) {
    throw new UserFetchError('Failed to fetch active users', error);
  }

  return data;
}

// app/api/users/route.ts
import { fetchActiveUsers } from '@/lib/services/userService';

export async function GET(req: NextRequest) {
  try {
    const users = await fetchActiveUsers();
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof UserFetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
    throw error;
  }
}
```

---

## Quick Checklist

When writing code, Claude should:

- [ ] ❌ Never use `any` type
- [ ] ✅ Use proper TypeScript types/interfaces
- [ ] ✅ Put database operations in service files
- [ ] ✅ Use custom error classes for better error handling
- [ ] ✅ Include JSDoc comments with authorization level
- [ ] ✅ Follow existing service file patterns
- [ ] ✅ Validate input with proper schemas (yup/zod)
- [ ] ✅ Use FERPA-compliant logging (see [lib/logger.ts](lib/logger.ts))

---

## Existing Service Files Reference

- [`lib/services/gradPlanService.ts`](lib/services/gradPlanService.ts) - Graduation plan operations
- [`lib/services/programService.ts`](lib/services/programService.ts) - Program/degree operations
- [`lib/services/profileService.ts`](lib/services/profileService.ts) - User profile operations
- [`lib/services/conversationService.ts`](lib/services/conversationService.ts) - Chat/conversation operations
- [`lib/services/notifService.ts`](lib/services/notifService.ts) - Notification operations
- [`lib/services/openaiService.ts`](lib/services/openaiService.ts) - OpenAI integration
- [`lib/services/server-actions.ts`](lib/services/server-actions.ts) - Server action wrappers

When in doubt, check these files for patterns to follow!

---

**Last Updated:** 2025-10-08
