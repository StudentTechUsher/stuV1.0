# Database Abstraction Layer

A flexible database abstraction that allows you to switch database providers without changing your service code.

## Quick Start

### Client-Side Usage

```typescript
import { db } from '@/lib/database';

// Query data
const { data, error } = await db
  .from('program')
  .select('*')
  .eq('university_id', 1)
  .order('created_at', { ascending: false });

// Insert data
const { data, error } = await db
  .from('program')
  .insert({ name: 'Computer Science', university_id: 1 });

// Update data
const { data, error } = await db
  .from('program')
  .update({ name: 'New Name' })
  .eq('id', '123');

// Delete data
const { error } = await db
  .from('program')
  .delete()
  .eq('id', '123');
```

### Server-Side Usage

```typescript
import { createServerDatabaseClient } from '@/lib/database/server';

export async function MyServerComponent() {
  const db = await createServerDatabaseClient();

  const { data, error } = await db
    .from('program')
    .select('*');

  return <div>{/* render data */}</div>;
}
```

## Architecture

```
lib/database/
├── index.ts                           # Main client export (use this!)
├── server.ts                          # Server-side client
├── types.ts                           # Database-agnostic interfaces
├── adapters/
│   ├── supabase.adapter.ts           # Current: Supabase implementation
│   └── supabase.adapter.test.ts      # Adapter tests
└── README.md                          # This file
```

## Why Use This?

### ✅ Provider Independence
Switch from Supabase to PostgreSQL, MySQL, or any other database by changing one file.

### ✅ Same Familiar API
Keep using the query builder syntax you already know.

### ✅ Type Safety
Full TypeScript support with proper types and autocomplete.

### ✅ Easy Testing
Mock the database client easily in your tests.

### ✅ Future Proof
Your business logic stays the same regardless of the database.

## How It Works

1. **You import `db`** from `@/lib/database`
2. **`db` is a `DatabaseClient`** that matches a standard interface
3. **The adapter** (currently Supabase) implements that interface
4. **To switch databases**, just swap the adapter in `lib/database/index.ts`

## Switching Database Providers

### Currently Using: Supabase

The current implementation uses Supabase:

```typescript
// lib/database/index.ts
import { SupabaseDatabaseAdapter } from './adapters/supabase.adapter';

function initializeDatabaseClient(): DatabaseClient {
  const supabaseClient = createBrowserClient(/*...*/);
  return new SupabaseDatabaseAdapter(supabaseClient);
}
```

### Want to Use PostgreSQL?

1. Create `lib/database/adapters/postgres.adapter.ts`
2. Implement the `DatabaseClient` interface
3. Change the initialization in `lib/database/index.ts`
4. Done! All your services now use PostgreSQL.

See [DATABASE_MIGRATION.md](../../DATABASE_MIGRATION.md) for detailed examples.

## API Reference

### Query Builder Methods

```typescript
db.from(table: string)              // Select table
  .select(columns?: string)         // SELECT columns
  .insert(data: any)                // INSERT data
  .update(data: any)                // UPDATE data
  .delete()                         // DELETE
  .eq(column, value)                // WHERE column = value
  .neq(column, value)               // WHERE column != value
  .gt(column, value)                // WHERE column > value
  .gte(column, value)               // WHERE column >= value
  .lt(column, value)                // WHERE column < value
  .lte(column, value)               // WHERE column <= value
  .like(column, pattern)            // WHERE column LIKE pattern
  .ilike(column, pattern)           // WHERE column ILIKE pattern (case-insensitive)
  .in(column, values[])             // WHERE column IN (values)
  .is(column, null | boolean)       // WHERE column IS null/true/false
  .contains(column, value)          // WHERE column @> value (JSON/Array)
  .order(column, {ascending: bool}) // ORDER BY column ASC/DESC
  .limit(count)                     // LIMIT count
  .range(from, to)                  // OFFSET from LIMIT (to-from)
  .single()                         // Return single row (or error)
  .maybeSingle()                    // Return single row or null
```

### Response Format

All queries return:
```typescript
{
  data: T | null,      // Your data on success
  error: Error | null  // Error message on failure
}
```

### Authentication

```typescript
// Get current user
const { data: { user }, error } = await db.auth.getUser();

// Sign in
const { user, error } = await db.auth.signIn({
  email: 'user@example.com',
  password: 'password'
});

// Sign out
await db.auth.signOut();

// Listen to auth changes
const { unsubscribe } = db.auth.onAuthStateChange((user) => {
  console.log('User:', user);
});
```

## Testing

### Mocking in Tests

```typescript
import { vi } from 'vitest';
import { mockSupabase } from '@/lib/__mocks__/supabase';

// Mock BEFORE importing your service
vi.mock('@/lib/database', () => ({
  db: mockSupabase,
}));

// Now import your service
import { myFunction } from './myService';

// Set up mock responses
mockSupabase.from.mockReturnThis();
mockSupabase.select.mockReturnThis();
mockSupabase.eq.mockResolvedValue({
  data: [{ id: 1, name: 'Test' }],
  error: null
});

// Run your test
const result = await myFunction();
expect(result).toEqual([{ id: 1, name: 'Test' }]);
```

See [TESTING.md](../../TESTING.md) for complete testing guide.

## Migration Guide

Migrating from direct Supabase imports? See [DATABASE_MIGRATION.md](../../DATABASE_MIGRATION.md) for:
- Step-by-step migration instructions
- Complete checklist of files to update
- Common issues and solutions
- Automated migration scripts

## Examples

### Complete CRUD Example

```typescript
import { db } from '@/lib/database';
import type { Program } from '@/types';

// Create
export async function createProgram(program: Program) {
  const { data, error } = await db
    .from('program')
    .insert(program)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Read
export async function getProgramById(id: string) {
  const { data, error } = await db
    .from('program')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Update
export async function updateProgram(id: string, updates: Partial<Program>) {
  const { data, error } = await db
    .from('program')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete
export async function deleteProgram(id: string) {
  const { error } = await db
    .from('program')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// List with filters
export async function getProgramsByUniversity(universityId: number) {
  const { data, error } = await db
    .from('program')
    .select('*')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

## Resources

- [types.ts](./types.ts) - Full TypeScript interfaces
- [adapters/supabase.adapter.ts](./adapters/supabase.adapter.ts) - Current implementation
- [DATABASE_MIGRATION.md](../../DATABASE_MIGRATION.md) - Migration guide
- [TESTING.md](../../TESTING.md) - Testing guide

## Support

For questions or issues:
1. Check [DATABASE_MIGRATION.md](../../DATABASE_MIGRATION.md) for migration help
2. See [TESTING.md](../../TESTING.md) for testing questions
3. Review the types in [types.ts](./types.ts) for API details
