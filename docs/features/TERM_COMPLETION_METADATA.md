# Term Completion Metadata Feature

## Overview
This feature adds a boolean metadata field (`allCoursesCompleted`) to each term in graduation plans that indicates if ALL courses in that term are completed. The metadata is calculated at runtime and stored in the database for performance.

## Implementation Summary

### Files Created
1. **`lib/utils/termHelpers.ts`** - Core utility functions for term completion logic
   - `calculateTermCompletion(term)` - Pure calculation function
   - `enrichTermWithCompletion(term)` - Adds metadata if missing
   - `getTermCompletionStats(term)` - Returns completion statistics

### Files Modified
1. **`components/grad-planner/types.ts`**
   - Added `allCoursesCompleted?: boolean` to Term interface

2. **`lib/services/gradPlanService.ts`**
   - Added `enrichPlanWithCompletion(planDetails)` - Enriches plans on load
   - Added `recalculatePlanCompletion(planDetails)` - Recalculates before save
   - Imported term helper utilities

3. **`app/(dashboard)/grad-plan/[accessId]/page.tsx`**
   - Calls enrichment on plan load (line ~345)
   - Recalculates metadata before saving (line ~475)
   - Ensures backward compatibility with old plans

4. **`components/grad-planner/TermCard.tsx`**
   - Uses `term.allCoursesCompleted` for completion status
   - Displays "Completed" badge for fully completed terms
   - Shows "X/Y done" badge for partially completed terms
   - Hides "Set as Current Term" button for completed terms

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
// A term is completed if:
// 1. It has at least one course, AND
// 2. ALL courses have isCompleted === true
//
// Empty terms return false (nothing to complete)
```

### Storage Strategy
- **Always Fresh**: Recalculated on every load AND save to ensure accuracy
- **Reason**: Course completion status can change between sessions, so we always recalculate from source data
- **Performance**: Calculation is cheap (just boolean checks on course data), accuracy is more important
- **Backward Compatible**: Old plans without metadata work seamlessly

## Edge Cases Handled

| Case | Behavior |
|------|----------|
| Empty term (no courses) | Returns `false` - nothing to complete |
| Partially completed term | Returns `false` - shows "X/Y done" badge |
| All courses completed | Returns `true` - shows "Completed" badge |
| Term with events only | Returns `false` - events don't count |
| `course.isCompleted` undefined | Treated as incomplete (strict `=== true`) |
| null/undefined courses array | Returns `false` - same as empty term |
| Old plan without metadata | Recalculated on load from course data |
| Metadata out of sync | Always recalculated on load and save |
| Course completion changes | Reflected immediately on next page load |

## Visual Indicators

### Completed Term
- Green "Completed" badge with checkmark icon
- "Set as Current Term" button hidden

### Partially Completed Term
- Blue "X/Y done" badge showing progress
- "Set as Current Term" button visible

### Empty/Incomplete Term
- No completion badge shown
- "Set as Current Term" button visible

## Benefits

✅ **Always Accurate**: Recalculated on every load and save from source course data
✅ **No Stale Data**: Never relies on potentially outdated stored metadata
✅ **Backward Compatible**: Works seamlessly with old plans without metadata
✅ **No AI Involvement**: Pure boolean logic based on course completion
✅ **Single Source of Truth**: Course `isCompleted` status is the only source
✅ **Reusable**: Any component can check `term.allCoursesCompleted`
✅ **Type-Safe**: Properly integrated into Term interface
✅ **Cheap Calculation**: Just boolean checks, no performance impact

## Testing Checklist

### Manual Testing
- [ ] Open existing grad plan (without metadata) - should enrich on load
- [ ] Verify "Completed" badge shows for fully completed terms
- [ ] Verify "X/Y done" badge shows for partially completed terms
- [ ] Mark all courses in a term complete - should show "Completed" after save
- [ ] "Set as Current Term" button hidden for completed terms
- [ ] Save plan and reload - metadata should persist

### Database Verification
- [ ] Check `plan_details` JSONB after saving
- [ ] Verify each term has `allCoursesCompleted: true/false`
- [ ] Confirm field matches actual course completion state

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
