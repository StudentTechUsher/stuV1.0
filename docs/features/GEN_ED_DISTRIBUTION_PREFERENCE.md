# General Education Distribution Preference

## Feature Overview

Added a toggle button (extended FAB) in the course selection form that allows undergraduate students to choose how they want their general education courses distributed throughout their graduation plan.

## UI Component

**Location:** Course Selection Form (before gen ed requirements section)

**Options:**
1. **Early Gen Eds** (⚡ Zap icon)
   - Front-loads general education courses in the first 2-4 semesters
   - Gets core requirements out of the way early
   - Allows more focus on major courses later

2. **Balanced Distribution** (⚖️ Scale icon) - **Default**
   - Spreads general education across all years
   - Mixes gen eds with major courses throughout
   - Reduces course load imbalance

## Implementation

### Frontend Changes

**File:** `components/chatbot-tools/CourseSelectionForm.tsx`

Added:
- State: `genEdDistribution` with type `'early' | 'balanced'` (default: `'balanced'`)
- Toggle UI component with rounded pill buttons
- Pass preference in `handleSubmit` as part of `CourseSelectionInput`

```tsx
{!isGraduateStudent && (
  <div className="mb-4 flex justify-center">
    <div className="inline-flex items-center bg-white border border-gray-200 rounded-full shadow-sm p-1">
      <button onClick={() => setGenEdDistribution('early')}>
        <Zap size={16} />
        Early Gen Eds
      </button>
      <button onClick={() => setGenEdDistribution('balanced')}>
        <Scale size={16} />
        Balanced Distribution
      </button>
    </div>
  </div>
)}
```

### Type Updates

**File:** `lib/chatbot/tools/courseSelectionTool.ts`

Updated `CourseSelectionSchema` to include:
```typescript
genEdDistribution: z.enum(['early', 'balanced']).optional()
```

### AI Processing

The `genEdDistribution` preference is passed to the AI in the course data JSON. The AI prompt (`organize_grad_plan` in the `ai_prompts` table) should be updated to handle this field.

## Recommended AI Prompt Addition

Add to the `organize_grad_plan` prompt in the database:

```
General Education Distribution Preference:
- If input includes "genEdDistribution": "early", prioritize scheduling general education courses in the first 2-4 planned terms. This means:
  * Front-load gen eds in Terms 1-4
  * Schedule at least 2-3 gen ed courses per term in early terms
  * Save major courses for later terms (5+)

- If input includes "genEdDistribution": "balanced" (or field is missing), spread general education across all planned terms:
  * Mix gen ed and major courses throughout
  * Aim for 1-2 gen ed courses per term
  * Avoid clustering all gen eds in one period
  * Balance workload types (writing, math, science) across terms

Default behavior (if field missing): Use balanced distribution.
```

### SQL Update Command

```sql
UPDATE ai_prompts
SET prompt = prompt || E'\n\nGeneral Education Distribution Preference:\n- If input includes "genEdDistribution": "early", prioritize scheduling general education courses in the first 2-4 planned terms. This means:\n  * Front-load gen eds in Terms 1-4\n  * Schedule at least 2-3 gen ed courses per term in early terms\n  * Save major courses for later terms (5+)\n  \n- If input includes "genEdDistribution": "balanced" (or field is missing), spread general education across all planned terms:\n  * Mix gen ed and major courses throughout\n  * Aim for 1-2 gen ed courses per term\n  * Avoid clustering all gen eds in one period\n  * Balance workload types (writing, math, science) across terms\n\nDefault behavior (if field missing): Use balanced distribution.'
WHERE prompt_name = 'organize_grad_plan';
```

## User Experience

### Before Selection
User sees the toggle at the top of the course selection form with "Balanced Distribution" selected by default.

### Early Gen Eds Selected
Plan will have most/all gen ed courses scheduled in Terms 1-4, with major courses concentrated in later terms.

**Benefits:**
- ✅ Get breadth requirements done early
- ✅ More flexibility later for major courses
- ✅ Clear separation between gen ed phase and major phase

**Drawbacks:**
- ⚠️ Less variety in early terms
- ⚠️ Potentially heavier gen ed load early on

### Balanced Distribution Selected
Plan will have gen ed courses mixed throughout all terms alongside major courses.

**Benefits:**
- ✅ Consistent variety in course types
- ✅ Balanced workload across all terms
- ✅ Prevents gen ed burnout

**Drawbacks:**
- ⚠️ Gen eds may interfere with advanced major courses scheduling
- ⚠️ Less focused progression

## Technical Notes

1. **Graduate Students**: Toggle is hidden (not applicable to graduate students)
2. **Default**: Balanced distribution (matches current prompt behavior)
3. **Validation**: No validation needed - always one of two valid options
4. **Persistence**: Not persisted - chosen each time user creates a plan
5. **AI Handling**: Passed as optional field in JSON, AI should default to balanced if missing

## Files Modified

1. `components/chatbot-tools/CourseSelectionForm.tsx`
   - Added state and UI for toggle
   - Added `genEdDistribution` to submission data

2. `lib/chatbot/tools/courseSelectionTool.ts`
   - Updated schema to include `genEdDistribution` field

## Testing

To verify:
1. ✅ Toggle appears for undergraduate students
2. ✅ Toggle hidden for graduate students
3. ✅ Default selection is "Balanced Distribution"
4. ✅ Clicking changes active state visually
5. ✅ Value is included in submission data
6. ⏳ After AI prompt update: verify plans reflect the selected distribution

## Future Enhancements

Possible improvements:
- Add tooltips explaining each option
- Show preview/estimate of distribution
- Add a third option: "Late Gen Eds" (opposite of Early)
- Allow saving preference to profile
- Add visual indicator of how gen eds will be distributed
