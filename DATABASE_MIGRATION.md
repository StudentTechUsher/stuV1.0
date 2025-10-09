# Database Abstraction Layer - Migration Guide

This guide explains how to migrate your codebase from direct Supabase imports to the new database abstraction layer.

## Why This Abstraction?

The database abstraction layer allows you to:
- ✅ **Switch database providers** by changing one file
- ✅ **Maintain the same query syntax** (minimal code changes)
- ✅ **Test more easily** with mocked database clients
- ✅ **Future-proof** your codebase for different backends

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Your Services (programService.ts, etc.)                │
│  import { db } from '@/lib/database'                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Database Abstraction Layer                             │
│  lib/database/index.ts                                  │
│  • Provides: db.from().select().eq()                    │
│  • Exports: DatabaseClient interface                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Database Adapter (Pluggable)                           │
│  lib/database/adapters/supabase.adapter.ts              │
│  • Current: SupabaseDatabaseAdapter                     │
│  • Future: PostgresAdapter, MySQLAdapter, etc.          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Actual Database (Supabase, PostgreSQL, etc.)           │
└─────────────────────────────────────────────────────────┘
```

## Quick Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { supabase } from '@/lib/supabase';
// or
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
```

**After (Client-side):**
```typescript
import { db } from '@/lib/database';
```

**After (Server-side):**
```typescript
import { createServerDatabaseClient } from '@/lib/database/server';
```

### Step 2: Update Database Calls

**Client-side - No changes needed!**
```typescript
// This works the same way
const { data, error } = await db
  .from('program')
  .select('*')
  .eq('university_id', 1);
```

**Server-side - Initialize first:**
```typescript
// Before:
const supabase = await createSupabaseServerComponentClient();
const { data } = await supabase.from('program').select('*');

// After:
const db = await createServerDatabaseClient();
const { data } = await db.from('program').select('*');
```

### Step 3: Update Tests

**Before:**
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));
```

**After:**
```typescript
vi.mock('@/lib/database', () => ({
  db: mockSupabase,
}));
```

## Complete Migration Checklist

Use this checklist to migrate each file:

### For Service Files (lib/services/*.ts)

- [ ] Change import from `@/lib/supabase` to `@/lib/database`
- [ ] Replace `supabase` with `db` throughout the file
- [ ] Run tests to verify nothing broke
- [ ] Commit the changes

**Example:** [lib/services/programService.ts](lib/services/programService.ts) ✅ Already migrated

### For Server-Side Files (app/api/*, Server Components)

- [ ] Change import to `@/lib/database/server`
- [ ] Replace `createSupabaseServerComponentClient()` with `createServerDatabaseClient()`
- [ ] Update variable names from `supabase` to `db`
- [ ] Test the endpoint/component

### For Client Components

- [ ] Change import from `@/lib/supabaseClient` to `@/lib/database`
- [ ] Replace `supabase` with `db` throughout the file
- [ ] Test in the browser

### For Test Files

- [ ] Update mock to use `@/lib/database` instead of `@/lib/supabase`
- [ ] Ensure mock is defined BEFORE importing the service
- [ ] Run tests: `npm run test:run -- path/to/test.ts`

## Files to Migrate

Based on grep results, these files import Supabase directly:

### Service Files (22 files total)
1. ✅ `lib/services/programService.ts` - **DONE** (example)
2. ⏳ `lib/services/profileService.ts`
3. ⏳ `lib/services/profileService.server.ts`
4. ⏳ `lib/services/conversationService.ts`
5. ⏳ `lib/services/notifService.ts`
6. ⏳ `lib/services/openaiService.ts`
7. ⏳ `lib/services/aiDbService.ts`
8. ⏳ `lib/services/gradPlanService.ts`
9. ⏳ `lib/api/server-actions.ts`
10. ⏳ `lib/api/client-actions.ts`
11. ⏳ `lib/api/profile.ts`

### Component Files
12. ⏳ `components/dashboard/nav-rail.tsx`
13. ⏳ `components/dashboard/academic-summary.tsx`
14. ⏳ `components/inbox/notifications-grid.tsx`
15. ⏳ `components/transcript/ParsedCoursesTable.tsx`
16. ⏳ `components/dashboard/snackbar-layer.tsx`
17. ⏳ `components/create-account/client-auth-gate.tsx`
18. ⏳ `components/create-account/create-account-client.tsx`

### App/Page Files
19. ⏳ `app/dashboard/pathfinder/major-actions.ts`
20. ⏳ `app/signup/page.tsx`
21. ⏳ `app/login/page.tsx`

### Other
22. ⏳ `lib/__mocks__/supabase.ts` - Update documentation

## Migration Script (Optional)

You can use this bash script to help automate the migration:

```bash
#!/bin/bash
# migrate-file.sh - Migrate a single file to use database abstraction

FILE=$1

if [ -z "$FILE" ]; then
  echo "Usage: ./migrate-file.sh <file-path>"
  exit 1
fi

# Backup the file
cp "$FILE" "$FILE.backup"

# Replace imports (client-side)
sed -i "s|from '@/lib/supabase'|from '@/lib/database'|g" "$FILE"
sed -i "s|from '@/lib/supabaseClient'|from '@/lib/database'|g" "$FILE"

# Replace imports (server-side)
sed -i "s|from '@/lib/supabase/server'|from '@/lib/database/server'|g" "$FILE"

# Replace function calls
sed -i "s|createSupabaseServerComponentClient|createServerDatabaseClient|g" "$FILE"

echo "✅ Migrated $FILE"
echo "   Backup saved to $FILE.backup"
echo "   Please review changes and test!"
```

## How to Switch Database Providers

Once all files are migrated, switching to a different database is easy:

### Example: Switching to PostgreSQL with Prisma

1. **Create a new adapter:**
   ```typescript
   // lib/database/adapters/prisma.adapter.ts
   import { PrismaClient } from '@prisma/client';
   import { DatabaseClient } from '../types';

   export class PrismaDatabaseAdapter implements DatabaseClient {
     constructor(private prisma: PrismaClient) {}
     // Implement the DatabaseClient interface
   }
   ```

2. **Update lib/database/index.ts:**
   ```typescript
   import { PrismaClient } from '@prisma/client';
   import { PrismaDatabaseAdapter } from './adapters/prisma.adapter';

   function initializeDatabaseClient(): DatabaseClient {
     const prismaClient = new PrismaClient();
     return new PrismaDatabaseAdapter(prismaClient);
   }
   ```

3. **Done!** All your services now use Prisma instead of Supabase.

### Example: Switching to Raw PostgreSQL

1. **Create adapter:**
   ```typescript
   // lib/database/adapters/postgres.adapter.ts
   import { Pool } from 'pg';
   import { DatabaseClient } from '../types';

   export class PostgresDatabaseAdapter implements DatabaseClient {
     constructor(private pool: Pool) {}
     // Implement the DatabaseClient interface
   }
   ```

2. **Update lib/database/index.ts:**
   ```typescript
   import { Pool } from 'pg';
   import { PostgresDatabaseAdapter } from './adapters/postgres.adapter';

   function initializeDatabaseClient(): DatabaseClient {
     const pool = new Pool({ connectionString: process.env.DATABASE_URL });
     return new PostgresDatabaseAdapter(pool);
   }
   ```

## Testing After Migration

For each file you migrate:

1. **Run the specific test:**
   ```bash
   npm run test:run -- path/to/service.test.ts
   ```

2. **Run all tests:**
   ```bash
   npm run test:run
   ```

3. **Test in the browser** (for components)

4. **Test API endpoints** (for server actions)

## Common Issues

### Issue: "db is not defined"
**Solution:** Make sure you imported `db` from `@/lib/database`

### Issue: Tests fail with "Cannot find module"
**Solution:** Check that the mock is defined BEFORE the import:
```typescript
// ❌ Wrong order
import { myFunction } from './myService';
vi.mock('@/lib/database', () => ({ db: mockDb }));

// ✅ Correct order
vi.mock('@/lib/database', () => ({ db: mockDb }));
import { myFunction } from './myService';
```

### Issue: Server-side "db is not a function"
**Solution:** Use `createServerDatabaseClient()` instead of direct `db` import:
```typescript
const db = await createServerDatabaseClient();
```

## Benefits After Full Migration

Once all 22 files are migrated:

1. **Single point of change** - Switch databases in one file
2. **Consistent API** - All services use the same `db` interface
3. **Better testing** - Mock the database easily
4. **Type safety** - TypeScript types enforce correct usage
5. **Future flexibility** - Add new database providers without changing services

## Progress Tracking

Track your migration progress:

```bash
# Count remaining files to migrate
grep -r "from '@/lib/supabase'" --include="*.ts" --include="*.tsx" | wc -l

# List remaining files
grep -r "from '@/lib/supabase'" --include="*.ts" --include="*.tsx" -l
```

## Questions?

- See [lib/database/types.ts](lib/database/types.ts) for the full API
- See [lib/database/adapters/supabase.adapter.ts](lib/database/adapters/supabase.adapter.ts) for implementation example
- See [lib/services/programService.ts](lib/services/programService.ts) for migration example
- See [TESTING.md](TESTING.md) for testing guidance
