# Phase 1 Rollback Plan

**Project:** Auth Hardening - Phase 1
**Production Database:** `bjpdmssagrqurlgzkxlr` (stuV1.0)
**Date:** 2026-02-10

---

## 🎯 Rollback Strategy

Phase 1 migrations are **purely additive** and don't modify existing tables (except adding a trigger). This makes rollback simple and safe.

**Key Facts:**
- ✅ No existing tables are modified (except `profiles` gets a new trigger)
- ✅ No existing data is deleted or modified
- ✅ No existing RLS policies are changed
- ✅ No existing functions are modified (except `is_advisor()` is updated to use new table)
- ⚠️ New tables are created and populated with backfilled data

**Rollback Impact:**
- Rolling back will remove the new auth infrastructure
- Existing app functionality will NOT be affected (nothing uses the new tables yet)
- Safe to rollback at any time before Phase 2 is deployed

---

## 📋 Rollback SQL Scripts

### Script 1: Remove Trigger (Rollback 20260209000004)

```sql
-- Remove trigger that protects privileged columns
DROP TRIGGER IF EXISTS trigger_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();
```

**Verification:**
```sql
-- Should return 0 rows
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trigger_protect_profile_privileged_columns';
```

---

### Script 2: Remove Helper Functions (Rollback 20260209000002)

```sql
-- Remove authorization helper functions
DROP FUNCTION IF EXISTS public.has_role(TEXT);
DROP FUNCTION IF EXISTS public.is_advisor_of_student(UUID);
DROP FUNCTION IF EXISTS public.is_university_admin_of(BIGINT);
DROP FUNCTION IF EXISTS public.get_user_university_id();

-- Restore original is_advisor() function
CREATE OR REPLACE FUNCTION public.is_advisor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Original implementation (checks profiles.role_id = 2)
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role_id = 2
  );
END;
$$;

COMMENT ON FUNCTION public.is_advisor() IS 'Check if current user has the advisor role (checks profiles.role_id)';
GRANT EXECUTE ON FUNCTION public.is_advisor() TO authenticated;
```

**Verification:**
```sql
-- Should return 1 row (only is_advisor)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%role%' OR routine_name LIKE '%advisor%');
```

---

### Script 3: Drop New Tables (Rollback 20260209000001 & 20260209000003)

```sql
-- Drop auth tables (cascades will handle foreign keys)
-- Note: This also removes all backfilled data
DROP TABLE IF EXISTS public.advisor_requests CASCADE;
DROP TABLE IF EXISTS public.advisor_programs CASCADE;
DROP TABLE IF EXISTS public.advisor_students CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
```

**Verification:**
```sql
-- Should return 0 rows
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_roles', 'advisor_students', 'advisor_programs', 'advisor_requests');
```

---

## 🚨 Complete Rollback Procedure

### Step 1: Pre-Rollback Verification

Before rolling back, verify what will be removed:

```sql
-- Check how many rows exist in each table
SELECT 'user_roles' as table_name, COUNT(*) as row_count FROM public.user_roles
UNION ALL
SELECT 'advisor_students', COUNT(*) FROM public.advisor_students
UNION ALL
SELECT 'advisor_programs', COUNT(*) FROM public.advisor_programs
UNION ALL
SELECT 'advisor_requests', COUNT(*) FROM public.advisor_requests;

-- Check if trigger exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.triggers
  WHERE trigger_name = 'trigger_protect_profile_privileged_columns'
) as trigger_exists;

-- Check if new helper functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('has_role', 'is_advisor_of_student', 'is_university_admin_of', 'get_user_university_id');
```

### Step 2: Execute Rollback (In Order)

**IMPORTANT:** Run scripts in this exact order:

```sql
-- 1. Remove trigger
DROP TRIGGER IF EXISTS trigger_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();

-- 2. Remove helper functions
DROP FUNCTION IF EXISTS public.has_role(TEXT);
DROP FUNCTION IF EXISTS public.is_advisor_of_student(UUID);
DROP FUNCTION IF EXISTS public.is_university_admin_of(BIGINT);
DROP FUNCTION IF EXISTS public.get_user_university_id();

-- Restore original is_advisor()
CREATE OR REPLACE FUNCTION public.is_advisor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role_id = 2
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_advisor() TO authenticated;

-- 3. Drop new tables
DROP TABLE IF EXISTS public.advisor_requests CASCADE;
DROP TABLE IF EXISTS public.advisor_programs CASCADE;
DROP TABLE IF EXISTS public.advisor_students CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
```

### Step 3: Post-Rollback Verification

Verify complete removal:

```sql
-- Should return 0 rows (tables don't exist)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_roles', 'advisor_students', 'advisor_programs', 'advisor_requests');

-- Should return 0 rows (trigger removed)
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trigger_protect_profile_privileged_columns';

-- Should return 0 rows (helper functions removed)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('has_role', 'is_advisor_of_student', 'is_university_admin_of', 'get_user_university_id');

-- Should return 1 row (is_advisor restored)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_advisor';
```

### Step 4: Test Existing Functionality

After rollback, verify app still works:

- [ ] Log in as a student - should work
- [ ] Log in as an advisor - should work
- [ ] `is_advisor()` function - should still work (checks `profiles.role_id = 2`)
- [ ] All existing features - should work normally

---

## 📊 Rollback Scenarios

### Scenario 1: Rollback Immediately After Deployment

**When:** Phase 1 was just deployed, something looks wrong
**Risk:** Very low - no data loss (can re-apply later)
**Steps:** Run complete rollback procedure above

### Scenario 2: Rollback After Some Time

**When:** Phase 1 has been running for hours/days
**Risk:** Low - Check if `advisor_requests` table has new data
**Steps:**
1. Check `advisor_requests` for any new requests:
   ```sql
   SELECT * FROM public.advisor_requests WHERE requested_at > '2026-02-10 00:00:00';
   ```
2. If new requests exist, export them first:
   ```sql
   COPY (SELECT * FROM public.advisor_requests) TO '/tmp/advisor_requests_backup.csv' CSV HEADER;
   ```
3. Run complete rollback procedure

### Scenario 3: Rollback After Phase 2 Started

**When:** Phase 2 service migration has begun
**Risk:** HIGH - DO NOT ROLLBACK
**Why:** Services may be using the new auth tables
**Alternative:** Fix forward instead of rolling back

---

## 🧪 Testing Rollback on Staging First

Before rolling back production, test on staging:

```bash
# 1. Link to staging
supabase link --project-ref pjvegkxvujfqcitekcmo

# 2. Execute rollback SQL via Supabase dashboard or CLI

# 3. Verify rollback worked

# 4. Re-apply migrations to verify they still work
# (This proves we can re-deploy if needed)
```

---

## 📝 Rollback Checklist

Before executing rollback:

- [ ] Document why we're rolling back (what went wrong?)
- [ ] Check `advisor_requests` table for new data (export if exists)
- [ ] Notify team that rollback is happening
- [ ] Test rollback on staging first (optional but recommended)
- [ ] Take a database snapshot/backup (Supabase has automatic backups)
- [ ] Execute rollback scripts in order
- [ ] Verify rollback with verification queries
- [ ] Test app functionality
- [ ] Update `docs/security/AUTH_HARDENING_PROGRESS.md` with rollback notes

---

## 🔄 Re-Applying After Rollback

If we need to re-apply Phase 1 after rollback:

```bash
# The migration files are still in the repo
# Just re-run them in order:
# 1. 20260209000001_create_auth_tables.sql
# 2. 20260209000002_create_auth_helper_functions.sql
# 3. 20260209000003_backfill_user_roles.sql
# 4. 20260209000004_protect_profile_privileged_columns.sql
```

The backfill will re-populate from `profiles.role_id` and `advisors.programs`, so no data loss.

---

## 🎯 Summary

**Phase 1 Rollback is:**
- ✅ Safe (purely additive changes)
- ✅ Simple (just DROP tables, functions, trigger)
- ✅ Reversible (can re-apply migrations)
- ✅ Low risk (no existing functionality depends on new tables)

**Only risk:** Losing data in `advisor_requests` if users submit requests between deployment and rollback. Solution: Export table before rollback.

**Recommendation:** Phase 1 is safe to deploy. Keep this rollback plan handy, but we likely won't need it.

---

**Last Updated:** 2026-02-10
