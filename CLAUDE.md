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

**ALL database transactions AND business logic MUST be in service files**

This is a critical architectural requirement. ALL database operations and business logic should reside in the [`lib/services/`](lib/services/) folder, not in API routes, components, or other locations.

When you encounter or need to write database operations or business logic:

1. **Check if a service file exists** in [`lib/services/`](lib/services/)
2. **Add the function to an existing service** if it fits the domain
3. **Create a new service file** if it's a new domain
4. **If you find database/business logic in `app/api/` or elsewhere**, refactor it into the appropriate service file

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

**❌ NEVER do database operations or business logic directly in:**
- API routes (API routes should be thin wrappers that call service functions)
- React components
- Utility functions
- Other non-service locations

**✅ ALWAYS:**
- Put ALL database logic and business logic in service files under [`lib/services/`](lib/services/)
- Use proper TypeScript types (no `any`)
- Include JSDoc comments with authorization level
- Handle errors with custom error classes
- Return typed data or throw typed errors
- Keep API routes as thin HTTP wrappers around service functions

---

### 2a. API Route Handler Naming

**NEVER use generic HTTP method names like `GET()`, `POST()`, `PATCH()`, `DELETE()` in API route handlers**

API route handlers should have descriptive names that clearly indicate what the endpoint does, not just the HTTP method.

- ❌ **Bad:**
  ```typescript
  // app/api/users/route.ts
  export async function GET(request: NextRequest) {
    // What does this do? Fetch one user? All users? Current user?
    const users = await fetchActiveUsers();
    return NextResponse.json({ users });
  }

  export async function POST(request: NextRequest) {
    // What does this do? Create user? Update user? Something else?
    const body = await request.json();
    // ...
  }
  ```

- ✅ **Good:**
  ```typescript
  // app/api/users/route.ts
  export async function GET(request: NextRequest) {
    return handleGetActiveUsers(request);
  }

  export async function POST(request: NextRequest) {
    return handleCreateUser(request);
  }

  // Descriptive handler functions
  async function handleGetActiveUsers(request: NextRequest) {
    try {
      const users = await fetchActiveUsers();
      return NextResponse.json({ users });
    } catch (error) {
      // Error handling...
    }
  }

  async function handleCreateUser(request: NextRequest) {
    try {
      const body = await request.json();
      const user = await createUser(body);
      return NextResponse.json({ user });
    } catch (error) {
      // Error handling...
    }
  }
  ```

**Pattern for API route handlers:**
1. Export the HTTP method function (`GET`, `POST`, etc.) as required by Next.js
2. Immediately delegate to a descriptive handler function: `handleGetX`, `handleCreateY`, `handleUpdateZ`
3. Put all logic in the descriptive handler function

**Benefits:**
- Easy to identify what each endpoint does when reading code
- Better code navigation and search
- Clearer stack traces in error logs
- Follows the principle of descriptive naming

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

### 3. React Best Practices

**Prefer Link component with href over programmatic navigation**

For navigation in Next.js applications, prefer using the Link component with href over programmatic router.push() calls, especially for buttons that trigger navigation.

- ❌ **Bad:**
  ```typescript
  import { useRouter } from 'next/navigation';

  const router = useRouter();
  const handleClick = () => {
    router.push('/some-route');
  };

  <button onClick={handleClick}>Go to Page</button>
  ```

- ✅ **Good:**
  ```typescript
  import Link from 'next/link';
  import { Button } from '@mui/material';

  <Button
    component={Link}
    href="/some-route"
    sx={{ /* styles */ }}
  >
    Go to Page
  </Button>
  ```

**Benefits:**
- Works with browser's native navigation (right-click to open in new tab)
- Better accessibility
- Improved SEO
- Cleaner code without handler functions

**When to use router.push():**
- After form submissions or async operations
- Conditional redirects based on data
- Redirects after successful mutations

---

**Page components (page.tsx) should ALWAYS be Server Components**

Next.js route page files should be Server Components by default for optimal performance and SEO.

- ❌ **Bad:**
  ```typescript
  // app/some-route/page.tsx
  "use client"

  export default function Page() {
    return <div>Content</div>
  }
  ```

- ✅ **Good:**
  ```typescript
  // app/some-route/page.tsx
  // No "use client" directive - Server Component by default

  export default function Page() {
    return <div>Content</div>
  }
  ```

**When you need client-side interactivity:**
- Extract interactive parts into separate Client Components
- Import and use these Client Components in your Server Component page
- Keep the page.tsx itself as a Server Component

**Example:**
```typescript
// app/some-route/page.tsx (Server Component)
import { ClientInteractiveForm } from './client-interactive-form'

export default function Page() {
  return (
    <div>
      <h1>Server-rendered heading</h1>
      <ClientInteractiveForm />
    </div>
  )
}

// app/some-route/client-interactive-form.tsx (Client Component)
"use client"

export function ClientInteractiveForm() {
  const [state, setState] = useState('')
  return <form>...</form>
}
```

---

**ALWAYS include ALL dependencies in React hook dependency arrays**

React's `useMemo`, `useCallback`, and `useEffect` hooks must include every value from component scope that they reference.

- ❌ **Bad:**
  ```typescript
  const parseData = (data: string) => { /* ... */ };
  
  const parsed = useMemo(() => {
    return parseData(rawData); // parseData missing from deps
  }, [rawData]);
  ```

- ✅ **Good:**
  ```typescript
  const parseData = useCallback((data: string) => { /* ... */ }, []);
  
  const parsed = useMemo(() => {
    return parseData(rawData);
  }, [rawData, parseData]); // All dependencies included
  ```

**For functions defined in component scope:**
- Wrap them in `useCallback()` if they're used in other hook dependencies
- Or move them inside the hook if they're only used there
- Or move them outside the component scope if they don't use component values

**For values that should be stable:**
- Use `useRef()` for mutable values that shouldn't trigger re-renders
- Move constants outside the component scope when possible

---

### 4. Error Handling Standards

**NEVER ignore caught exceptions - always log them**

When catching errors, provide useful debugging information while respecting FERPA compliance.

- ❌ **Bad:**
  ```typescript
  try {
    await riskyOperation();
  } catch (e) {
    return { success: false, error: 'Operation failed' };
  }
  ```

- ✅ **Good:**
  ```typescript
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Risky operation failed:', error);
    return { success: false, error: 'Operation failed' };
  }
  ```

**Error Variable Naming:**
- Use `error` instead of `e` for caught exceptions
- Use descriptive variable names: `validationError`, `networkError`, etc.
- Prefix intentionally unused variables with `_` (e.g., `_unusedParam`)

---

### 5. Code Cleanup Standards

**Remove dead code instead of commenting it out**

- ❌ **Bad:**
  ```typescript
  // const oldFunction = () => { ... };
  // Legacy approach - keeping for reference
  ```

- ✅ **Good:**
  ```typescript
  // Remove entirely - use git history if needed
  ```

**Unused Variables Policy:**
- Remove if truly unused
- Use `_` prefix for intentionally unused parameters (e.g., API requirements)
- Add `eslint-disable-next-line` with explanation for necessary exceptions

**Example:**
```typescript
// For API conformance where parameter is required but unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleEvent = (_event: MouseEvent) => {
  // Implementation doesn't need event details
};
```

---

### 6. ESLint Configuration Standards

**Configure ESLint rules to match project conventions**

When you encounter patterns that need project-wide policy decisions, update the ESLint configuration instead of adding individual overrides.

**Underscore-prefixed unused variables:**
```javascript
// eslint.config.mjs
"@typescript-eslint/no-unused-vars": [
  "warn",
  {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_", 
    "caughtErrorsIgnorePattern": "^_"
  }
]
```

**When to use underscore prefixes:**
- ✅ Function parameters required by API but not used: `_event`, `_userId`
- ✅ Destructured values that are placeholders: `{ name, slug: _slug }`
- ✅ Future extension points: `_routeContext` for methods designed to vary by context later
- ❌ Don't use for values you should actually be using

**Prefer ESLint configuration over individual disable comments:**
- ❌ **Bad:** Adding `// eslint-disable-next-line` everywhere
- ✅ **Good:** Update project-wide rules in `eslint.config.mjs`

---

### 7. Environment Configuration Standards

**Development vs Production Database Setup**

The application supports using a local development Supabase instance when in development mode. This is configured through environment variables.

**Environment Variables:**
```bash
# Production Supabase (always required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Development Supabase (optional - only used when NEXT_PUBLIC_ENV=development)
SUPABASE_DEV_URL=http://localhost:54321
SUPABASE_DEV_ANON_KEY=your-dev-anon-key

# Environment mode
NEXT_PUBLIC_ENV=development  # or production
```

**Client Configuration Pattern:**

All Supabase client creation functions must support automatic environment-based switching:

```typescript
function getSupabaseConfig() {
  const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
  const hasDevConfig = !!(process.env.SUPABASE_DEV_URL && process.env.SUPABASE_DEV_ANON_KEY)

  const supabaseUrl = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabaseAnonKey = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_ANON_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return { supabaseUrl, supabaseAnonKey }
}
```

**Affected Files:**
- `lib/supabase.ts` - Shared Supabase client
- `lib/supabase/client.ts` - Browser client factory
- `lib/supabase/server.ts` - Server client factories

**Behavior:**
- When `NEXT_PUBLIC_ENV=development` AND both dev variables are set → uses dev database
- Otherwise → falls back to production database
- This ensures graceful degradation if dev config is incomplete

**Getting Dev Keys:**

For local Supabase instance:
```bash
# If using Supabase CLI
npx supabase status

# Default local anon key (if using standard setup)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

---

## Quick Checklist

When writing code, Claude should:

- [ ] Do not introduce Python into this repository; if a Python solution is absolutely required, implement it in a separate environment and expose it through a well-defined API.
- [ ] Never use ny type
- [ ] Use proper TypeScript types/interfaces
- [ ] Put database operations in service files
- [ ] Use descriptive handler names in API routes (not just GET(), POST())
- [ ] Use custom error classes for better error handling
- [ ] Include JSDoc comments with authorization level
- [ ] Follow existing service file patterns
- [ ] Validate input with proper schemas (yup/zod)
- [ ] Use FERPA-compliant logging (see [lib/logger.ts](lib/logger.ts))
- [ ] Keep page.tsx files as Server Components (extract client logic to separate components)
- [ ] Include ALL dependencies in React hook dependency arrays
- [ ] Log caught exceptions with meaningful context
- [ ] Remove dead code instead of commenting it out
- [ ] Use descriptive error variable names (error not e)
- [ ] Configure ESLint rules for project-wide patterns
- [ ] Use underscore prefix for intentional unused variables

---

## Existing Service Files Reference

- [`lib/services/gradPlanService.ts`](lib/services/gradPlanService.ts) - Graduation plan operations
- [`lib/services/programService.ts`](lib/services/programService.ts) - Program/degree operations
- [`lib/services/profileService.ts`](lib/services/profileService.ts) - User profile operations (client-side)
- [`lib/services/profileService.server.ts`](lib/services/profileService.server.ts) - User profile operations (server-side)
- [`lib/services/institutionService.ts`](lib/services/institutionService.ts) - Institution settings management
- [`lib/services/transcriptService.ts`](lib/services/transcriptService.ts) - Transcript parsing and course management
- [`lib/services/conversationService.ts`](lib/services/conversationService.ts) - Chat/conversation operations
- [`lib/services/notifService.ts`](lib/services/notifService.ts) - Notification operations
- [`lib/services/withdrawalService.ts`](lib/services/withdrawalService.ts) - Withdrawal notification operations
- [`lib/services/careerService.ts`](lib/services/careerService.ts) - Career information management
- [`lib/services/openaiService.ts`](lib/services/openaiService.ts) - OpenAI integration and AI operations
- [`lib/services/emailService.ts`](lib/services/emailService.ts) - Email sending functionality
- [`lib/services/utilityService.ts`](lib/services/utilityService.ts) - Utility functions (color extraction, etc.)
- [`lib/services/server-actions.ts`](lib/services/server-actions.ts) - Server action wrappers

When in doubt, check these files for patterns to follow!

---

**Last Updated:** 2025-11-03


