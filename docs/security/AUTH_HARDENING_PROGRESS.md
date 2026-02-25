# Authorization Hardening - Session Progress

**Date:** 2026-02-10
**Current Status:** Phase 2 COMPLETE - All services migrated to supabaseAdmin

---

## ✅ What We Accomplished Today

### 1. Created Phase 1 Migration Files

Four migration files created in `supabase/migrations/`:

- **20260209000001_create_auth_tables.sql** - Creates 4 new tables
  - `user_roles` - Canonical role assignments (RLS enabled, clients can't write)
  - `advisor_students` - Explicit advisor-student relationships
  - `advisor_programs` - Advisor-program access control
  - `advisor_requests` - Self-service advisor role requests

- **20260209000002_create_auth_helper_functions.sql** - Creates RLS helper functions
  - `has_role(role)` - Check if user has a role
  - `is_advisor_of_student(student_id)` - Check advisor relationship
  - `is_university_admin_of(university_id)` - Check admin access
  - `is_advisor()` - Fixed to use new `user_roles` table
  - `get_user_university_id()` - Get user's university

- **20260209000003_backfill_user_roles.sql** - Migrate existing data
  - Backfills `user_roles` from `profiles.role_id`
  - Backfills `advisor_programs` from `advisors.programs` array

- **20260209000004_protect_profile_privileged_columns.sql** - Security trigger
  - Prevents client writes to `profiles.role_id`, `university_id`, `onboarded`, `authorization_agreed`
  - Only `service_role` can modify these fields

### 2. Successfully Deployed to Staging

**Staging Database:** `pjvegkxvujfqcitekcmo` (stu_byu)

**Verified Results:**
- ✅ All 4 tables created
- ✅ 24 user roles backfilled (19 students, 4 advisors, 1 admin)
- ✅ RLS policies active
- ✅ Helper functions working
- ✅ Trigger installed on profiles table

---

## ✅ Phase 1: DEPLOYED TO PRODUCTION (2026-02-10)

**Production Database:** `bjpdmssagrqurlgzkxlr` (stuV1.0)

**Verified Results:**
- ✅ All 4 auth tables created and populated
- ✅ 24 user roles backfilled (19 students, 4 advisors, 1 admin)
- ✅ All 5 helper functions installed
- ✅ Security trigger active on profiles table
- ✅ RLS policies enabled on new tables

---

## ✅ Phase 2: SERVICE LAYER MIGRATION COMPLETE (2026-02-10)

**What We Accomplished:**

### 1. Created Authorization Service
- **File:** `lib/services/authorizationService.ts`
- **10 helper functions** for role checks and authorization
- All functions use `supabaseAdmin` (service_role)
- Proper TypeScript types and error handling

### 2. Migrated 18 Service Files to supabaseAdmin
All service files now use `supabaseAdmin` instead of unauthenticated `supabase`:
- gradPlanService.ts (1145 lines - largest)
- notifService.ts, scheduleService.ts, conversationService.ts
- aiDbService.ts, withdrawalService.ts, transcriptService.ts
- openaiService.ts, generateScheduleService.ts, courseOfferingService.ts
- careerService.ts, programService.ts, auth.ts
- userCoursesService.ts, studentService.ts, institutionService.ts
- gpaService.ts, server-actions.ts

### 3. Updated All Role Checks in server-actions.ts
- ✅ Replaced 8 direct `profiles.role_id` checks
- ✅ Now uses `hasRole()` from authorizationService
- ✅ Queries new `user_roles` table instead of `profiles.role_id`

**Documentation:** See `docs/security/PHASE2_MIGRATION_COMPLETE.md` for full details.

---

## 🎯 Next Steps: Phase 3

### Step 1: Apply Phase 1 to Production (COMPLETED)

**Production Database:** `bjpdmssagrqurlgzkxlr` (stuV1.0)

```bash
# 1. Link to production project
supabase link --project-ref bjpdmssagrqurlgzkxlr

# 2. Verify you're linked to production
supabase status

# 3. Apply migrations (using Supabase MCP tool via Claude)
# Claude will run: mcp__supabase__apply_migration for each of the 4 migrations

# 4. Verify deployment
# Check that tables exist and data was backfilled correctly
```

**Expected Production Results:**
- `user_roles`: ~24 rows (all current users)
- `advisor_students`: 0 rows (no explicit relationships yet)
- `advisor_programs`: 0 rows (if advisors.programs is NULL)
- `advisor_requests`: 0 rows (none submitted)

### Step 2: Verify Phase 1 Works

Run these SQL queries on production to verify:

```sql
-- Check role distribution
SELECT role, COUNT(*) as count
FROM public.user_roles
GROUP BY role
ORDER BY count DESC;

-- Verify trigger works (try to update role_id - should fail silently)
-- Test as a student user via app

-- Verify helper functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%role%' OR routine_name LIKE '%advisor%';
```

### Step 3: Test in Production

**Manual Testing Checklist:**
- [ ] Log in as a student
- [ ] Try to modify `profiles.role_id` via browser console (should fail)
- [ ] Verify student can view their own role via `user_roles` table
- [ ] Log in as an advisor
- [ ] Verify advisor can view their role
- [ ] Check that no existing functionality is broken

---

## 📋 Phase 2 - Service Layer Migration (Next After Phase 1)

**Goal:** Migrate all services from `supabase` (unauthenticated) to `supabaseAdmin` (service role)

**Why:** After Phase 1, we have the auth tables. Before enabling RLS (Phase 3), we need to ensure all server-side services use `supabaseAdmin` so they can continue to work after RLS is enabled.

**Files to Modify (12 services):**

1. `lib/services/gradPlanService.ts` - Largest (1100 lines, 30 queries)
2. `lib/services/notifService.ts`
3. `lib/services/scheduleService.ts`
4. `lib/services/conversationService.ts`
5. `lib/services/aiDbService.ts`
6. `lib/services/withdrawalService.ts`
7. `lib/services/transcriptService.ts`
8. `lib/services/openaiService.ts`
9. `lib/services/generateScheduleService.ts`
10. `lib/services/courseOfferingService.ts`
11. `lib/services/careerService.ts`
12. `lib/services/server-actions.ts` - Update 8 role check locations

**New File to Create:**
- `lib/services/authorizationService.ts` - Centralized auth helpers

**Change Pattern:**
```typescript
// Before
import { supabase } from '../supabase';
const { data } = await supabase.from('table').select();

// After
import { supabaseAdmin } from '@/lib/supabaseAdmin';
const { data } = await supabaseAdmin.from('table').select();
```

---

## 📋 Phase 3 - Enable RLS (After Phase 2)

**Goal:** Enable RLS on all 11 tables that currently have it disabled

**Why:** This is when database-enforced authorization actually kicks in

**Tables to Protect:**
- `profiles`, `student`, `grad_plan`, `student_schedules`, `notifications`, `ai_responses`, `roles`, etc.

**Critical:** Must complete Phase 2 first, otherwise services will break when RLS is enabled.

---

## 📋 Phase 4 - Attack Tests (Final Verification)

**Goal:** 10 automated tests proving privilege escalation is impossible

**File:** `tests/security/authorization-attacks.test.ts`

**Tests Include:**
- Student A cannot access Student B's data
- Student cannot modify `profiles.role_id`
- Student cannot INSERT into `user_roles`
- Advisor cannot access unlinked students
- Etc.

---

## 🔑 Key Environment Info

**Supabase Projects:**
- **Production:** `bjpdmssagrqurlgzkxlr` (stuV1.0)
- **Staging:** `pjvegkxvujfqcitekcmo` (stu_byu)

**Migration Files Location:**
- `supabase/migrations/2026020900000*.sql`

**Supabase Config:**
- `supabase/config.toml` - Updated to Postgres 17, analytics disabled

**Local Setup Issues (FYI):**
- Local Supabase has Docker container health check issues (vector service)
- Workaround: Use staging database for testing instead of local

---

## 📚 Reference Documents

- **Full Plan:** See the plan you provided at the start of this session
- **Auth Model:** `docs/security/AUTH_MODEL.md`
- **Service Files:** `lib/services/*.ts`
- **CLAUDE.md:** Project guidelines (no `any` types, service layer pattern, etc.)

---

## 🚨 Important Notes

1. **Phase 1 is safe** - Purely additive, doesn't break existing functionality
2. **Phase 2 is required** before Phase 3 - Services must use `supabaseAdmin` before RLS is enabled
3. **Don't skip phases** - Each builds on the previous
4. **Staging is ready** - All Phase 1 migrations successfully applied
5. **Production is next** - Just needs the same 4 migrations applied

---

## 📞 Quick Start for Tomorrow

```bash
# 1. Open terminal in project directory
cd /Users/vinjones/stuV1.0

# 2. Link to production
supabase link --project-ref bjpdmssagrqurlgzkxlr

# 3. Ask Claude to apply Phase 1 migrations to production
# "Apply the 4 Phase 1 auth migrations to production (bjpdmssagrqurlgzkxlr)"

# 4. Verify with SQL queries (see Step 2 above)

# 5. Test manually (see Step 3 above)

# 6. If all good, proceed to Phase 2
```

---

**Status:** Ready to deploy Phase 1 to production tomorrow! 🚀
