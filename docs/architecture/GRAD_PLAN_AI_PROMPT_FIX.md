# Graduation Plan AI Prompt Structure Fix

## Problem Summary

When the graduation plan finished generating, the system showed this error:
```
Invalid plan structure - no terms found
Expected to find an array of terms, but got: { "plannedTerms": [...], "plan": [], ... }
```

## Root Causes

### 1. Missing Example Structure File
The file `config/prompts/semester-plan-example.json` was deleted but is referenced by the AI prompt. Without this example, the AI had no clear template to follow and returned an inconsistent structure.

**Status:** ✅ **FIXED** - Created the missing file with the correct structure.

### 2. Parser Not Checking for `plannedTerms`
The `usePlanParser.ts` was checking for:
- `plan` array
- `semesters` array
- `terms` array

But NOT checking for `plannedTerms` array that the AI returned.

**Status:** ✅ **FIXED** - Updated parser to also check for `plannedTerms` (backward compatible).

### 3. Ambiguous Database Prompt
The prompt in the `ai_prompts` table references an example structure via placeholder but doesn't explicitly state field names.

**Status:** ⚠️ **NEEDS UPDATE** - See recommendations below.

## Changes Made

### 1. Restored `config/prompts/semester-plan-example.json`
Location: `C:\Users\matth\Desktop\stuV1.0\config\prompts\semester-plan-example.json`

**Action:** Restored from git history using `git checkout HEAD -- config/prompts/semester-plan-example.json`

This file provides a concrete example showing:
- `plan` array (NOT `plannedTerms`) containing term objects
- Each term has: `term` (string), `courses` (array), `credits_planned` (number)
- Optional: `notes` (string), `assumptions` (array), `checkpoints` (array)
- Program and requirement metadata

### 2. Updated `usePlanParser.ts`
Location: `C:\Users\matth\Desktop\stuV1.0\components\grad-planner\usePlanParser.ts`

Added check for `plannedTerms` array (lines 41-44):
```typescript
// Check for plannedTerms property (AI response format variant)
if (Array.isArray(planRecord.plannedTerms)) {
  return planRecord.plannedTerms as Term[];
}
```

This ensures backward compatibility with any plans already generated using `plannedTerms`.

## Recommended Database Prompt Updates

Update the `organize_grad_plan` prompt in the `ai_prompts` table to add this section at the end:

```
CRITICAL OUTPUT STRUCTURE:
You MUST return JSON with the "plan" field as the main array of terms.

REQUIRED top-level field:
- "plan" (array) - NOT "plannedTerms", "terms", or "semesters"
  * Each element is a term object with:
    - "term" (string): "1", "2", etc. or "Term 1", "Term 2"
    - "courses" (array): course objects with code, title, credits, fulfills
    - "credits_planned" (number): sum of credits in this term
    - "notes" (string, optional): term-specific guidance

OPTIONAL top-level fields (recommended):
- "assumptions" (array of strings): planning assumptions
- "checkpoints" (array): application/milestone reminders
- "duration_years" (number): planned duration
- "program" (string): program name

WRONG: { "plannedTerms": [...] }
WRONG: { "terms": [...] }
RIGHT: { "plan": [...] }

The example structure file (semester-plan-example.json) shows the complete expected format.
```

### How to Update the Database Prompt

Run this SQL in your Supabase SQL Editor:

```sql
UPDATE ai_prompts
SET prompt = prompt || E'\n\nCRITICAL OUTPUT STRUCTURE:\nYou MUST return JSON with these exact top-level fields:\n\n1. "plan" (array) - NOT "plannedTerms" or "terms"\n   - Each element is a term object with:\n     * "term" (string): "Term 1", "Term 2", etc.\n     * "courses" (array): course objects with code, title, credits, fulfills\n     * "termCredits" (number): sum of credits in this term\n\n2. "takenCourses" (array) - courses already completed\n\n3. "summary" (object):\n   * "creditsFromTaken" (number)\n   * "plannedCredits" (number)\n   * "targetCredits" (number)\n   * "totalCreditsAfterPlan" (number)\n   * "termsPlanned" (number)\n   * "notes" (array of strings)\n\n4. "est_grad_sem" (string): e.g., "Spring", "Fall"\n\n5. "est_grad_date" (string): ISO date string\n\n6. "plan_name" (string): can be empty\n\n7. "programs" (array): objects with id and name\n\nWRONG: { "plannedTerms": [...] }\nRIGHT: { "plan": [...] }\n\nSee the example structure above for the exact format.'
WHERE prompt_name = 'organize_grad_plan';
```

## Testing

To verify the fix works:

1. ✅ Parser now handles both `plan` and `plannedTerms` formats
2. ✅ Example structure file is in place with correct format
3. ⏳ After updating database prompt, generate a new plan and verify it uses `plan` field
4. ⏳ Existing plans with `plannedTerms` should still load correctly (backward compatible)

## Prevention

To prevent this issue in the future:

1. **Never delete files in `config/prompts/`** - they are referenced by the AI system
2. **Version control prompt examples** - treat them as critical configuration
3. **Add validation** - Consider adding JSON schema validation for AI responses
4. **Test prompt changes** - Always test prompt updates with real generation before deploying

## Related Files

- `lib/services/openaiService.ts:282-289` - Loads example structure file
- `components/grad-planner/usePlanParser.ts:5-57` - Parses plan structure
- `components/grad-planner/graduation-planner.tsx:354-366` - Shows error message
- Database table: `ai_prompts`, row: `organize_grad_plan`
