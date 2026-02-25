# Phase 2: Service Layer Migration - COMPLETE

**Date:** 2026-02-10
**Status:** ✅ All services migrated to supabaseAdmin

---

## 🎯 What Phase 2 Accomplished

Phase 2 migrated all service layer database operations from the unauthenticated `supabase` client to the authenticated `supabaseAdmin` (service_role) client. This prepares the application for Phase 3 (enabling RLS on all tables).

---

## ✅ Files Created

### 1. Authorization Service
**File:** `lib/services/authorizationService.ts`

**Purpose:** Centralized authorization helpers using the new `user_roles` table

**Functions created:**
- `hasRole(userId, role)` - Check if user has a specific role
- `getUserRoles(userId)` - Get all roles for a user
- `isAdvisorOfStudent(advisorId, studentId)` - Check advisor-student relationship
- `isUniversityAdminOf(userId, universityId)` - Check university admin access
- `isAdvisor(userId)` - Check if user is an advisor
- `isStudent(userId)` - Check if user is a student
- `isSuperAdmin(userId)` - Check if user is a super admin
- `getUserUniversityId(userId)` - Get user's university ID
- `grantRole(userId, role, universityId, grantedBy)` - Grant a role (admin only)
- `revokeRole(userId, role)` - Revoke a role (admin only)

**All functions:**
- Use `supabaseAdmin` (service_role) for database access
- Have proper TypeScript types
- Include custom error classes
- Have JSDoc comments with authorization levels

---

## ✅ Service Files Migrated to supabaseAdmin

All service files that perform database operations have been migrated from `supabase` to `supabaseAdmin`:

### Core Services (12 files)
1. ✅ `lib/services/gradPlanService.ts` (1145 lines - largest file)
2. ✅ `lib/services/notifService.ts`
3. ✅ `lib/services/scheduleService.ts`
4. ✅ `lib/services/conversationService.ts`
5. ✅ `lib/services/aiDbService.ts`
6. ✅ `lib/services/withdrawalService.ts`
7. ✅ `lib/services/transcriptService.ts`
8. ✅ `lib/services/openaiService.ts`
9. ✅ `lib/services/generateScheduleService.ts`
10. ✅ `lib/services/courseOfferingService.ts`
11. ✅ `lib/services/careerService.ts`
12. ✅ `lib/services/programService.ts`

### Additional Services (6 files)
13. ✅ `lib/services/auth.ts`
14. ✅ `lib/services/userCoursesService.ts`
15. ✅ `lib/services/studentService.ts`
16. ✅ `lib/services/institutionService.ts`
17. ✅ `lib/services/gpaService.ts`
18. ✅ `lib/services/server-actions.ts` (role checks updated)

**Total:** 18 service files migrated

---

## ✅ server-actions.ts Role Checks Updated

**File:** `lib/services/server-actions.ts`

**Changes made:**
1. Added import for `hasRole` from `authorizationService`
2. Replaced **8 role check locations** that previously queried `profiles.role_id` directly

**Before (Old Pattern):**
```typescript
const { data: profile, error: profileError } = await supabaseSrv
    .from('profiles')
    .select('role_id')
    .eq('id', user.id)
    .maybeSingle();
if (profileError || !profile || profile.role_id !== 2) {
    return { success: false, error: 'Not authorized' };
}
```

**After (New Pattern):**
```typescript
const isAdvisor = await hasRole(user.id, 'advisor');
if (!isAdvisor) {
    return { success: false, error: 'Not authorized' };
}
```

**Role checks updated:**
- ✅ 4 advisor checks (`role_id !== 2` → `hasRole(userId, 'advisor')`)
- ✅ 4 student checks (`role_id === 3` → `hasRole(userId, 'student')`)

---

## 📊 Migration Statistics

- **Files created:** 1 (authorizationService.ts)
- **Service files migrated:** 18
- **Role checks updated:** 8 locations in server-actions.ts
- **Total lines affected:** ~5000+ lines across all service files

---

## 🔍 Verification

### Check supabaseAdmin usage:
```bash
grep -l 'supabaseAdmin' lib/services/*.ts | wc -l
# Expected: 13+ files
```

### Verify no old supabase imports remain:
```bash
grep -l 'from.*["\x27]@/lib/supabase["\x27]\|from.*["\x27]\.\./supabase["\x27]' lib/services/*.ts
# Expected: empty (all migrated)
```

### Verify all role checks updated:
```bash
grep "profile.role_id ===" lib/services/server-actions.ts
# Expected: empty (all replaced with hasRole)
```

---

## 🎯 Why This Matters

**Before Phase 2:**
- Services used unauthenticated `supabase` client
- When RLS is enabled (Phase 3), these queries would fail
- Role checks queried `profiles.role_id` directly (not using new `user_roles` table)

**After Phase 2:**
- All services use `supabaseAdmin` (service_role)
- Service-role bypasses RLS, so queries will continue working after Phase 3
- Role checks use centralized `authorizationService` that queries `user_roles` table
- Authorization logic is consistent across the application

**Phase 2 is REQUIRED before Phase 3** - Without this migration, enabling RLS would break all service layer database operations.

---

## 🚀 Next Steps: Phase 3

**Phase 3: Enable RLS on All Tables**

Now that all services use `supabaseAdmin`, we can safely enable RLS on all tables without breaking existing functionality.

**Tables to protect (11 total):**
- `profiles`
- `student`
- `grad_plan`
- `student_schedules`
- `notifications`
- `ai_responses`
- `roles`
- `class_preferences`
- `career_options`
- `advisors`
- `user_courses`

**RLS Policies to create:**
- Students can SELECT their own data
- Advisors can SELECT students they advise
- University admins can SELECT all data for their university
- Super admins can SELECT all data
- Only service_role can INSERT/UPDATE/DELETE (via services)

---

## 📚 Files Changed Summary

### New Files:
- `lib/services/authorizationService.ts` - Centralized auth helpers

### Modified Files (18):
- `lib/services/gradPlanService.ts` - Migrated to supabaseAdmin
- `lib/services/notifService.ts` - Migrated to supabaseAdmin
- `lib/services/scheduleService.ts` - Migrated to supabaseAdmin
- `lib/services/conversationService.ts` - Migrated to supabaseAdmin
- `lib/services/aiDbService.ts` - Migrated to supabaseAdmin
- `lib/services/withdrawalService.ts` - Migrated to supabaseAdmin
- `lib/services/transcriptService.ts` - Migrated to supabaseAdmin
- `lib/services/openaiService.ts` - Migrated to supabaseAdmin
- `lib/services/generateScheduleService.ts` - Migrated to supabaseAdmin
- `lib/services/courseOfferingService.ts` - Migrated to supabaseAdmin
- `lib/services/careerService.ts` - Migrated to supabaseAdmin
- `lib/services/programService.ts` - Migrated to supabaseAdmin
- `lib/services/auth.ts` - Migrated to supabaseAdmin
- `lib/services/userCoursesService.ts` - Migrated to supabaseAdmin
- `lib/services/studentService.ts` - Migrated to supabaseAdmin
- `lib/services/institutionService.ts` - Migrated to supabaseAdmin
- `lib/services/gpaService.ts` - Migrated to supabaseAdmin
- `lib/services/server-actions.ts` - Updated role checks

---

## ✅ Phase 2 Status: COMPLETE

**All tasks completed successfully!** 🎉

Ready to proceed to Phase 3: Enable RLS on all tables.

---

**Last Updated:** 2026-02-10
