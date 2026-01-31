# Term Completion Metadata Feature

## Overview
This feature adds two boolean metadata fields to each term in graduation plans:
- **`allCoursesCompleted`**: Indicates if ALL courses were completed successfully (`isCompleted === true`)
- **`termPassed`**: Indicates if the term has already occurred (all courses have status - either "Completed" or "Withdrawn")

These fields are calculated at runtime and stored in the database, ensuring the UI always reflects the current state of course data.

## Implementation Summary

### Files Created
1. **`lib/utils/termHelpers.ts`** - Core utility functions for term completion logic
   - `calculateTermCompletion(term)` - Pure calculation function
   - `enrichTermWithCompletion(term)` - Adds metadata if missing
   - `getTermCompletionStats(term)` - Returns completion statistics

### Files Modified
1. **`components/grad-planner/types.ts`**
   - Added `CourseStatus` type (`'Completed' | 'Withdrawn'`)
   - Updated `Course` interface to include `status`, `grade`, `term`, `source` fields
   - Changed `title` to allow `string | null`
   - Added `allCoursesCompleted?: boolean` to Term interface
   - Added `termPassed?: boolean` to Term interface

2. **`lib/utils/termHelpers.ts`**
   - `calculateTermCompletion()` - Checks if ALL courses have `isCompleted === true`
   - `calculateTermPassed()` - Checks if ALL courses have a status (Completed or Withdrawn)
   - `enrichTermWithCompletion()` - Adds both metadata fields if missing
   - `getTermCompletionStats()` - Returns detailed stats (completed, withdrawn, planned counts)

3. **`lib/services/gradPlanService.ts`**
   - Added `enrichPlanWithCompletion(planDetails)` - Enriches plans on load
   - Added `recalculatePlanCompletion(planDetails)` - Recalculates both fields before save
   - Imported term helper utilities

4. **`app/(dashboard)/grad-plan/[accessId]/page.tsx`**
   - Calls `recalculatePlanCompletion()` on plan load to ensure fresh metadata
   - Recalculates metadata before saving
   - Ensures backward compatibility with old plans

5. **`components/grad-planner/TermCard.tsx`**
   - Uses `term.allCoursesCompleted` for successful completion status
   - Uses `term.termPassed` to determine if term is in the past
   - Displays "Completed" badge for fully completed terms (green)
   - Displays "X/Y passed (XW)" badge for passed terms with withdrawals (orange)
   - Shows "X/Y done" or "Planned" badge for future terms (blue)
   - Hides "Set as Current Term" button for passed terms (not just completed)

6. **Local Course interfaces** (multiple files)
   - Updated `title` field to `string | null` in: `CourseMoveField.tsx`, `DraggableCourseOverlay.tsx`, `SpaceViewTermCard.tsx`, `DroppableTerm.tsx`

## How It Works

### Data Flow
```
Load Plan from DB
    ↓
Always recalculate allCoursesCompleted from current course data
    ↓
Display in UI with fresh, accurate metadata
    ↓
User makes changes & saves
    ↓
Recalculate all metadata → Store in DB
```

**Why always recalculate?**
- Course completion status can change between sessions
- User may toggle `isCompleted` on courses
- Stored metadata could become stale
- Calculation is cheap (just boolean checks)
- Accuracy > tiny performance gain

### Calculation Logic
```typescript
// allCoursesCompleted: A term is fully completed if:
// 1. It has at least one course, AND
// 2. ALL courses have isCompleted === true
// Empty terms return false (nothing to complete)

// termPassed: A term has passed (is in the past) if:
// 1. It has at least one course, AND
// 2. ALL courses have a status field (either "Completed" or "Withdrawn")
// Future/planned courses don't have a status field
// Empty terms return false
```

**Key Distinction:**
- **`allCoursesCompleted`**: Strict success check (all courses passed)
- **`termPassed`**: Historical check (term has occurred, regardless of success)

### Storage Strategy
- **Always Fresh**: Recalculated on every load AND save to ensure accuracy
- **Reason**: Course completion status can change between sessions, so we always recalculate from source data
- **Performance**: Calculation is cheap (just boolean checks on course data), accuracy is more important
- **Backward Compatible**: Old plans without metadata work seamlessly

## Edge Cases Handled

| Case | `allCoursesCompleted` | `termPassed` | Display |
|------|----------------------|--------------|---------|
| Empty term (no courses) | `false` | `false` | No badge |
| All courses completed | `true` | `true` | Green "Completed" badge |
| Some completed, some withdrawn | `false` | `true` | Orange "X/Y passed (XW)" badge |
| All courses withdrawn | `false` | `true` | Orange "0/Y passed (YW)" badge |
| Partially completed (past term) | `false` | `true` | Orange badge with stats |
| Some completed, rest planned | `false` | `false` | Blue "X/Y done" badge |
| All courses planned (future) | `false` | `false` | Blue "Planned" badge |
| Term with events only | `false` | `false` | No badge (events don't count) |
| `course.isCompleted` undefined | Treated as incomplete | - | Depends on status field |
| `course.status` missing | - | Treated as planned | Future term |
| `course.title` is null | Allowed | Allowed | Title displays as empty |
| null/undefined courses array | `false` | `false` | No badge |
| Old plan without metadata | Recalculated on load | Recalculated on load | Fresh values |
| Metadata out of sync | Always recalculated | Always recalculated | Accuracy guaranteed |

## Visual Indicators

### Fully Completed Term (Past)
- ✅ Green "Completed" badge with checkmark icon
- `allCoursesCompleted = true`, `termPassed = true`
- "Set as Current Term" button hidden (term is in the past)

### Passed Term with Withdrawals (Past)
- ⚠️ Orange "X/Y passed (XW)" badge showing completed and withdrawn counts
- `allCoursesCompleted = false`, `termPassed = true`
- "Set as Current Term" button hidden (term is in the past)
- Example: "3/5 passed (2W)" means 3 completed, 2 withdrawn

### Partially Completed Term (Current/Future)
- 📊 Blue "X/Y done" badge showing progress
- `allCoursesCompleted = false`, `termPassed = false`
- "Set as Current Term" button visible
- Has some completed courses but still has planned courses

### Planned Term (Future)
- 📋 Blue "Planned" badge
- `allCoursesCompleted = false`, `termPassed = false`
- "Set as Current Term" button visible
- All courses have no status (future courses)

### Empty Term
- No completion badge shown
- "Set as Current Term" button visible

## Benefits

✅ **Always Accurate**: Recalculated on every load and save from source course data
✅ **No Stale Data**: Never relies on potentially outdated stored metadata
✅ **Backward Compatible**: Works seamlessly with old plans without metadata
✅ **No AI Involvement**: Pure boolean logic based on course status fields
✅ **Single Source of Truth**: Course `isCompleted` and `status` are the only sources
✅ **Dual Purpose**: Tracks both success (completed) and history (passed)
✅ **Scheduler Integration**: `termPassed` prevents scheduling past terms in semester-scheduler
✅ **Withdrawal Support**: Properly handles withdrawn courses (W grades)
✅ **Reusable**: Any component can check `term.allCoursesCompleted` or `term.termPassed`
✅ **Type-Safe**: Properly integrated into Term and Course interfaces
✅ **Cheap Calculation**: Just boolean checks on status fields, no performance impact

## Testing Checklist

### Manual Testing - Completion Status
- [ ] Open existing grad plan (without metadata) - should recalculate on load
- [ ] Verify green "Completed" badge shows for fully completed terms
- [ ] Verify orange "X/Y passed (XW)" badge shows for terms with withdrawals
- [ ] Verify blue "X/Y done" badge shows for partially completed future terms
- [ ] Verify blue "Planned" badge shows for future terms with no completed courses
- [ ] Mark all courses in a term complete - should show "Completed" after save/reload

### Manual Testing - Term Passed Status
- [ ] "Set as Current Term" button hidden for ALL past terms (completed OR withdrawn)
- [ ] "Set as Current Term" button visible for future/current terms
- [ ] Verify past terms (with status) can't be scheduled in semester-scheduler
- [ ] Verify future terms (no status) can be scheduled in semester-scheduler

### Manual Testing - Withdrawals
- [ ] Create a term with some completed and some withdrawn courses
- [ ] Verify it shows orange badge with withdrawal count
- [ ] Verify `termPassed = true` but `allCoursesCompleted = false`
- [ ] Verify "Set as Current Term" button is hidden

### Database Verification
- [ ] Check `plan_details` JSONB after saving
- [ ] Verify each term has `allCoursesCompleted: true/false`
- [ ] Verify each term has `termPassed: true/false`
- [ ] Confirm fields match actual course status data
- [ ] Verify courses have `status: "Completed" | "Withdrawn"` for past terms
- [ ] Verify future courses have no `status` field

## Future Enhancements

- Add overall plan completion percentage in page header
- Add filter to show only incomplete terms
- Add analytics to track completion rates
- Add celebration animation when term is fully completed

## Related Files

- Core Logic: `lib/utils/termHelpers.ts`
- Type Definitions: `components/grad-planner/types.ts`
- Service Layer: `lib/services/gradPlanService.ts`
- UI Component: `components/grad-planner/TermCard.tsx`
- Page Integration: `app/(dashboard)/grad-plan/[accessId]/page.tsx`
