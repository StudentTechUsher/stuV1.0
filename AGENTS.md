# Agent Guidelines for Build Error Resolution

This document contains specific instructions for AI agents (like Codex) to follow when resolving build errors, warnings, and linting issues.

---

## ⚠️ CRITICAL: Protected Infrastructure Files

### Rule 0: DO NOT MODIFY These Files Without Explicit Permission

The following files are **CRITICAL INFRASTRUCTURE** and must NOT be modified when fixing build errors or warnings:

**NEVER MODIFY:**
- ❌ `middleware.ts` - Handles authentication, routing, and request processing
- ❌ `lib/supabase/server.ts` - Server-side Supabase client configuration
- ❌ `lib/supabase/client.ts` - Client-side Supabase client configuration
- ❌ `lib/supabaseClient.ts` - Shared Supabase configuration
- ❌ `.env` or `.env.local` files - Environment configuration
- ❌ `next.config.js` or `next.config.mjs` - Next.js configuration
- ❌ `package.json` - Dependencies and scripts

**Why:**
- These files control authentication, database connections, and app infrastructure
- Changes to these files can break authentication for all users
- Modifications can cause runtime errors that are hard to debug
- These require manual review and testing

**If you encounter errors in these files:**
1. ✅ **STOP** - Do not attempt to fix automatically
2. ✅ Report the error to the user with full context
3. ✅ Suggest checking recent git history: `git log --oneline -- <filename>`
4. ✅ Suggest reviewing the git diff: `git diff <filename>`
5. ✅ Ask user for explicit permission before making any changes
6. ❌ **NEVER** attempt to "fix" them automatically

**Example - What NOT to do:**

```typescript
// ❌ NEVER replace the Supabase client with manual fetch calls
// middleware.ts - BAD - This breaks authentication!
const session = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
  headers: { Authorization: `Bearer ${token}` }
})

// ✅ ALWAYS use the established Supabase client pattern
// middleware.ts - GOOD
const supabase = createSupabaseServerClient(request, response)
const { data: { session } } = await supabase.auth.getSession()
```

**If authentication is broken after middleware.ts changes:**

```bash
# Check what changed
git diff middleware.ts

# Revert to last working version
git checkout HEAD -- middleware.ts

# Restart dev server
pnpm dev
```

**Common Mistakes to Avoid:**

```typescript
// ❌ Don't refactor working Supabase client code
// ❌ Don't "optimize" authentication logic
// ❌ Don't replace async/await patterns
// ❌ Don't remove error handling
// ❌ Don't change environment variable names
// ❌ Don't modify redirect logic without understanding auth flow

// ✅ If you see TypeScript errors in these files:
//    - Report them to the user
//    - Don't attempt to fix with 'any' types
//    - Don't refactor the code structure
```

---

## TypeScript Error Resolution

### Rule 1: NEVER use the `any` type

When encountering TypeScript errors, DO NOT use `any` as a solution.

**Alternatives to `any`:**
- Use `unknown` for truly unknown types, then narrow with type guards
- Define proper interfaces or types
- Use generics when appropriate
- Use `Record<string, unknown>` for object types
- Use utility types like `Partial<T>`, `Pick<T>`, `Omit<T>`

**Example:**
```typescript
// ❌ NEVER do this
function handleData(data: any) { ... }

// ✅ Use unknown and type guard
function handleData(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // Type narrowing here
  }
}

// ✅ Or define proper type
interface DataInput {
  value: string;
  count: number;
}
function handleData(data: DataInput) { ... }
```

### Rule 2: Use Database Types

For database-related types, always import from `@/lib/database/types.ts`:

```typescript
import { Tables, TablesInsert, Enums } from '@/lib/database/types';

// Get row type
type Profile = Tables<'profiles'>;

// Get insert type
type NewProfile = TablesInsert<'profiles'>;

// Get enum type
type YearInSchool = Enums<'Year In School'>;
```

---

## Unused Variables

### Rule 3: Handle Unused Variables Properly

**Priority Order:**
1. **Remove if truly unused** - Delete the variable entirely
2. **Use underscore prefix** - If required by API or intentionally unused: `_unusedParam`
3. **Last resort** - Add ESLint disable comment with explanation

**When to use underscore prefix:**
```typescript
// ✅ Function parameter required by API but not used
const handleEvent = (_event: MouseEvent) => {
  // Implementation doesn't need event
}

// ✅ Destructured placeholder
const { name, slug: _slug } = data;

// ✅ React onChange when only using one argument
onChange={(_event, newValue) => setValue(newValue)}
```

**ESLint disable (use sparingly):**
```typescript
// Only when underscore prefix isn't appropriate
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const configValue = requiredByFramework;
```

---

## React Hooks

### Rule 4: Include ALL Dependencies in Hook Arrays

React hooks (`useEffect`, `useMemo`, `useCallback`) must include every value from component scope that they reference.

**Common patterns:**

```typescript
// ✅ Wrap functions in useCallback
const parseData = useCallback((data: string) => {
  // parse logic
}, []);

const result = useMemo(() => {
  return parseData(rawData);
}, [rawData, parseData]); // Include ALL dependencies

// ✅ Or move function inside the hook
const result = useMemo(() => {
  const parseData = (data: string) => { /* ... */ };
  return parseData(rawData);
}, [rawData]);

// ✅ Or move function outside component if it doesn't use props/state
function parseData(data: string) { /* ... */ }

function Component({ rawData }) {
  const result = useMemo(() => parseData(rawData), [rawData]);
}
```

---

## Error Handling

### Rule 5: Proper Error Variable Naming and Logging

**Always:**
- Use `error` instead of `e` for caught exceptions
- Log errors with `console.error()`
- Provide context in error messages

```typescript
// ❌ BAD
try {
  await operation();
} catch (e) {
  return { success: false };
}

// ✅ GOOD
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: 'Operation failed' };
}
```

---

## MUI Component Updates

### Rule 6: Use Modern MUI Props

MUI has deprecated certain props. Use the modern equivalents:

```typescript
// ❌ Deprecated
<Dialog
  PaperProps={{
    sx: { ... }
  }}
/>

// ✅ Modern
<Dialog
  slotProps={{
    paper: {
      sx: { ... }
    }
  }}
/>
```

---

## Import and Export Issues

### Rule 7: Proper Module Imports

**When encountering module resolution errors:**

1. Check if path alias is correct: `@/lib/...` not `lib/...`
2. Verify file exists at the path
3. Check for circular dependencies
4. Ensure proper exports from the module

```typescript
// ✅ Use path aliases
import { supabase } from '@/lib/supabaseClient';
import { Tables } from '@/lib/database/types';

// ❌ Don't use relative paths across directories
import { supabase } from '../../../lib/supabaseClient';
```

---

## Dead Code

### Rule 8: Remove Commented Code

When fixing warnings about unused code:

**DO:**
- Delete commented-out code entirely
- Remove unused imports
- Remove unused variables

**DON'T:**
- Leave commented code "for reference"
- Keep unused imports "just in case"

```typescript
// ❌ Remove these
// const oldFunction = () => { ... };
// import { UnusedComponent } from './old';

// ✅ Clean code with only what's used
import { UsedComponent } from './current';
```

---

## Server vs Client Components

### Rule 9: Proper "use client" Directive Placement

**Page files (page.tsx) should be Server Components:**
```typescript
// ❌ Don't add "use client" to page.tsx
// app/dashboard/page.tsx
"use client"  // REMOVE THIS

export default function DashboardPage() { ... }
```

**Client Components should be separate files:**
```typescript
// ✅ Extract client logic to separate file
// app/dashboard/client-form.tsx
"use client"

export function DashboardForm() {
  const [state, setState] = useState('');
  // ... client logic
}

// app/dashboard/page.tsx (Server Component)
import { DashboardForm } from './client-form';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardForm />
    </div>
  );
}
```

---

## Quick Resolution Checklist

When encountering build errors or warnings:

1. **TypeScript errors**
   - [ ] Never use `any` type
   - [ ] Import types from `@/lib/database/types`
   - [ ] Use `unknown` with type guards if needed

2. **Unused variable warnings**
   - [ ] Remove if truly unused
   - [ ] Use `_` prefix if intentionally unused
   - [ ] Only use eslint-disable as last resort

3. **React hook warnings**
   - [ ] Include ALL dependencies in arrays
   - [ ] Use useCallback for function dependencies
   - [ ] Consider moving functions outside component

4. **Error handling**
   - [ ] Use `error` not `e` for catch variable
   - [ ] Always log with console.error()
   - [ ] Provide meaningful error context

5. **MUI deprecation warnings**
   - [ ] Replace `PaperProps` with `slotProps={{ paper: {} }}`
   - [ ] Check MUI docs for other deprecated props

6. **Import/Export errors**
   - [ ] Use path aliases (`@/lib/...`)
   - [ ] Verify file exists
   - [ ] Check for circular dependencies

7. **Code cleanup**
   - [ ] Remove commented code
   - [ ] Remove unused imports
   - [ ] Delete dead code entirely

8. **Component structure**
   - [ ] Keep page.tsx as Server Components
   - [ ] Extract client logic to separate files
   - [ ] Use "use client" only in client components

---

## Priority Order for Fixes

When multiple issues exist, fix in this order:

1. **Type safety issues** (any type, missing types)
2. **Breaking errors** (import errors, missing dependencies)
3. **React hook dependencies** (can cause runtime bugs)
4. **Deprecated API usage** (MUI props, etc.)
5. **Unused variables** (warnings)
6. **Code cleanup** (dead code, comments)

---

**Last Updated:** 2025-01-08

## Summary

This document protects critical infrastructure files and provides clear guidance for resolving build errors safely. When in doubt about modifying a file, always ask the user first.
