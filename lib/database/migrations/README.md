# Database Migrations

This directory contains SQL migration scripts for the student advising platform.

## Migration Files

### 001_create_careers_table.sql
Creates the `careers` table for storing career information used in the pathfinder feature.

**Features:**
- Full career data including education requirements, salary info, and outlook
- JSONB columns for flexible nested data (best_majors, salary_usd, outlook, links)
- Array columns for lists (top_skills, day_to_day, location_hubs)
- Full-text search indexes on title and overview
- GIN index on skills for efficient filtering
- Row Level Security (RLS) policies:
  - Public can view published careers
  - Advisors/admins can view and manage all careers
- Auto-updating `updated_at` timestamp

**Columns:**
- `id`, `slug`, `title`, `short_overview`, `overview`
- `education_level`, `certifications`, `best_majors`
- `location_hubs`, `salary_usd`, `outlook`
- `top_skills`, `day_to_day`
- `recommended_courses`, `internships`, `clubs`
- `related_careers`, `links`
- `status` ('published' | 'draft'), `published_at`
- Audit: `created_at`, `updated_at`, `updated_by_*`

### 002_create_advisors_table.sql
Creates the `advisors` table for storing advisor information with organizational scope.

**Features:**
- Links to `profiles` table via `profile_id`
- Organizational scope hierarchy (UNIVERSITY → COLLEGE → DEPARTMENT → MAJOR)
- Scoped IDs for filtering (college_id, department_id, major_id)
- Row Level Security (RLS) policies:
  - Advisors can view their own record
  - Admins can view and manage all advisors
- Auto-updating `updated_at` timestamp

**Columns:**
- `id`, `profile_id`, `name`, `email`
- `scope` ('UNIVERSITY' | 'COLLEGE' | 'DEPARTMENT' | 'MAJOR')
- `college_id`, `department_id`, `major_id`
- `created_at`, `updated_at`, `is_active`

### 003_create_withdrawals_tables.sql
Creates the `withdrawals` and `withdrawal_outbox` tables for tracking student course withdrawals and email digests.

**Features:**
- Tracks enrollment actions (ENROLL, WITHDRAW)
- Auto-calculates `days_after_deadline` using trigger
- Withdrawal outbox for weekly email digests
- JSONB digest_data for flexible email content
- Row Level Security (RLS) policies:
  - Advisors can view withdrawals within their organizational scope
  - Advisors can view their own outbox
  - Service role can manage outbox (for cron jobs)
- Indexes on student_id, course_id, action, and timestamps

**Withdrawals Table Columns:**
- `id`, `student_id`, `course_id`
- `action` ('ENROLL' | 'WITHDRAW'), `action_at`, `reason`
- `add_drop_deadline`, `days_after_deadline` (auto-calculated)
- `created_at`

**Withdrawal Outbox Table Columns:**
- `id`, `advisor_id`, `digest_data` (JSONB)
- `sent`, `sent_at`, `error_message`
- `period_start`, `period_end`
- `created_at`, `updated_at`

## Running Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the migration file contents
5. Run the query
6. Repeat for each migration in order (001, 002, 003)

### Option 2: Supabase CLI
```bash
# Make sure you're in the project root
cd c:\Users\matth\Desktop\stuV1.0

# Run migrations in order
supabase db execute --file lib/database/migrations/001_create_careers_table.sql
supabase db execute --file lib/database/migrations/002_create_advisors_table.sql
supabase db execute --file lib/database/migrations/003_create_withdrawals_tables.sql
```

### Option 3: Direct psql Connection
```bash
# Connect to your Supabase database
psql postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/postgres

# Run each migration
\i lib/database/migrations/001_create_careers_table.sql
\i lib/database/migrations/002_create_advisors_table.sql
\i lib/database/migrations/003_create_withdrawals_tables.sql
```

## Verifying Migrations

After running migrations, verify they were successful:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('careers', 'advisors', 'withdrawals', 'withdrawal_outbox');

-- Check table structure
\d careers
\d advisors
\d withdrawals
\d withdrawal_outbox

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('careers', 'advisors', 'withdrawals', 'withdrawal_outbox');

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('careers', 'advisors', 'withdrawals', 'withdrawal_outbox');
```

## Migration Dependencies

These migrations assume the following tables already exist:
- `profiles` - User profiles (referenced by advisors.profile_id)
- `student` - Student records (referenced by withdrawals.student_id)

If these tables don't exist, you'll need to create them first or modify the foreign key constraints.

## Rollback

To rollback these migrations:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS withdrawal_outbox CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS advisors CASCADE;
DROP TABLE IF EXISTS careers CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_careers_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_advisors_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_withdrawal_outbox_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_days_after_deadline() CASCADE;
```

## Next Steps

After running migrations:

1. **Seed initial data** (optional):
   - Run seed scripts to populate careers table with sample data
   - Create initial advisor records

2. **Update service files** to use database instead of mocks:
   - Services are already configured to use these tables
   - No code changes needed - just run migrations

3. **Test API routes**:
   - Test `/api/careers` endpoints
   - Test `/api/withdrawals` endpoints
   - Verify RLS policies work correctly

4. **Configure environment variables**:
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (for admin operations)

## Notes

- All tables use Row Level Security (RLS) for data protection
- Auto-updating triggers keep `updated_at` timestamps current
- JSONB columns allow flexible data structures without schema changes
- GIN indexes enable efficient full-text and array searches
- Foreign key constraints ensure referential integrity

## Support

For issues or questions:
1. Check Supabase logs in the dashboard
2. Verify RLS policies match your authentication setup
3. Ensure referenced tables (profiles, student) exist
4. Review [DATABASE_MIGRATION.md](../../DATABASE_MIGRATION.md) for more context
