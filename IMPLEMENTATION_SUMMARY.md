# Admin Class-Selection Mode Implementation Summary

## Overview
Implemented three selection modes for how students choose classes during plan creation: AUTO (all auto-selected), MANUAL (all manually selected), and CHOICE (student picks at creation time).

---

## Files Added/Changed

### 1. SQL Migration
**File:** `supabase/migrations/20251001_institution_settings_selection_mode.sql`
- Created `institution_settings` table with `selection_mode` column (TEXT: 'AUTO'|'MANUAL'|'CHOICE')
- Added RLS policies: read for all institution members, write for admins only (role_id=1)
- Seeded default 'MANUAL' mode for all existing institutions

### 2. Types & Constants
**File:** `lib/selectionMode.ts`
- Exported `SelectionMode` type: `'AUTO' | 'MANUAL' | 'CHOICE'`
- Exported `SELECTION_MODES` constant array
- Exported `coerceSelectionMode()` utility function (validates/defaults to MANUAL)
- Exported `SELECTION_MODE_DESCRIPTIONS` for UI display

### 3. API Routes
**File:** `app/api/institutions/[universityId]/settings/route.ts`
- **GET**: Returns current `selection_mode` for the institution (RLS enforced)
- **PATCH**: Updates `selection_mode` (admin-only via RLS; returns 403 if not admin)
- Validates mode against `SELECTION_MODES` array
- Returns 400 for invalid universityId or missing/invalid `selection_mode`

### 4. Admin Settings UI
**File:** `app/dashboard/admin/settings/page.tsx`
- Fetches current user's `university_id` from `/api/my-profile`
- Fetches current `selection_mode` from `/api/institutions/[universityId]/settings`
- Dropdown to select one of three modes (AUTO/MANUAL/CHOICE)
- Displays descriptions for each mode
- Save button calls PATCH endpoint
- Shows loading spinner during fetch/save
- Snackbar notifications for success/error

### 5. Questionnaire Dialog Changes
**File:** `components/grad-planner/create-grad-plan-dialog.tsx`

**Added State:**
- `institutionMode`: fetched SelectionMode from API
- `loadingInstitutionMode`: boolean for fetch skeleton
- `userChosenMode`: 'AUTO' | 'MANUAL' (student's choice when institutionMode='CHOICE')

**Added Effects:**
- `useEffect` on mount: fetch user profile → fetch institution settings → set `institutionMode`
- Computes `effectiveMode` based on `institutionMode` and `userChosenMode`:
  - If institutionMode='AUTO' → effectiveMode='AUTO'
  - If institutionMode='MANUAL' → effectiveMode='MANUAL'
  - If institutionMode='CHOICE' → effectiveMode=`userChosenMode`

**UI Changes:**
- Shows loading spinner while fetching `institutionMode`
- If `institutionMode='CHOICE'`: displays a toggle switch (AUTO ↔ MANUAL) with explanatory text
- If `effectiveMode='AUTO'`: displays info alert ("Courses will be auto-selected by STU...")
- If `effectiveMode='AUTO'`: hides all course dropdown sections (GenEd and Program requirements)
- If `effectiveMode='MANUAL'`: shows all dropdowns as before

**Validation Changes:**
- `areAllDropdownsFilled` now returns `true` immediately if `effectiveMode='AUTO'` (bypasses dropdown checks)
- In MANUAL mode, validation remains unchanged (all dropdowns must be filled)

**Payload Changes:**
- `handleCreatePlan()` attaches `selectionMode: effectiveMode` to the JSON payload sent to `OrganizeCoursesIntoSemesters`

### 6. Planner Service Branching
**File:** `lib/services/openaiService.ts` (in `OrganizeCoursesIntoSemesters_ServerAction`)

**Added Logic:**
- Extracts `selectionMode` from coursesData payload (defaults to 'MANUAL')
- Branching:
  - **AUTO**: logs "AUTO mode" message; TODO comment for full heuristic implementation (auto-select courses based on student prefs, catalog constraints, load balancing)
  - **MANUAL**: logs "MANUAL mode" message; trusts student selections (validated client-side)
  - **CHOICE**: resolved client-side to AUTO or MANUAL; no separate branch here
- Passes `processedCoursesData` to AI prompt (currently unchanged in AUTO mode; placeholder for future auto-selection logic)

---

## Acceptance Checklist

### Admin Settings
- [ ] Admin can navigate to `/dashboard/admin/settings`
- [ ] Admin sees current selection mode loaded from DB
- [ ] Admin can change mode (AUTO/MANUAL/CHOICE) via dropdown
- [ ] Admin can save changes; sees success snackbar
- [ ] Non-admin users cannot update settings (403 Forbidden from API)
- [ ] Settings persist across page refreshes

### Student Questionnaire Flow

#### Institution Mode = AUTO
- [ ] Student opens "Create New Plan" dialog
- [ ] Dialog shows info alert: "Courses will be auto-selected by STU..."
- [ ] GenEd requirement dropdowns are hidden
- [ ] Program requirement dropdowns are hidden
- [ ] Student selects major/minor only
- [ ] "Create AI-Organized Plan" button enabled after selecting ≥1 program
- [ ] Plan creation succeeds; plan is populated with courses
- [ ] Student can edit/swap courses after plan creation

#### Institution Mode = MANUAL
- [ ] Student opens "Create New Plan" dialog
- [ ] No toggle or auto-selection alert shown
- [ ] GenEd requirement dropdowns visible and must be filled
- [ ] Program requirement dropdowns visible and must be filled
- [ ] "Create AI-Organized Plan" button disabled until all dropdowns filled
- [ ] Plan creation succeeds with student-selected courses

#### Institution Mode = CHOICE
- [ ] Student opens "Create New Plan" dialog
- [ ] Dialog shows toggle: "Plan Mode: AUTO ↔ MANUAL"
- [ ] Toggle defaults to AUTO
- [ ] When AUTO selected:
  - Shows info alert
  - Hides all dropdowns
  - Button enabled after selecting ≥1 program
- [ ] When MANUAL selected:
  - Hides info alert
  - Shows all dropdowns
  - Button disabled until all filled
- [ ] Plan creation includes resolved mode (AUTO or MANUAL) in payload

### Server-Side Branching
- [ ] Server logs "📌 AUTO mode" or "📌 MANUAL mode" based on payload
- [ ] AUTO mode: plan created (full heuristics not implemented; TODO stub in place)
- [ ] MANUAL mode: plan created with student selections
- [ ] Plan data stored correctly in DB with accessId

### API Endpoints
- [ ] `GET /api/institutions/[universityId]/settings` returns `{ selection_mode: 'MANUAL' }` (or AUTO/CHOICE)
- [ ] `PATCH /api/institutions/[universityId]/settings` with valid JSON updates DB
- [ ] `PATCH` returns 403 if user is not admin (role_id ≠ 1)
- [ ] `PATCH` returns 400 for invalid `selection_mode` value

### RLS Policies
- [ ] All users at an institution can read `institution_settings` for their university
- [ ] Only admins (role_id=1) can write to `institution_settings`
- [ ] Non-admins receive policy violation error (403) on attempted write

### Edge Cases
- [ ] If `institution_settings` row does not exist, GET returns default 'MANUAL'
- [ ] If user is not authenticated, API returns 401
- [ ] If universityId is invalid (NaN), API returns 400
- [ ] Dialog handles fetch errors gracefully (defaults to MANUAL mode)

---

## Notes for Future Work
- **AUTO mode heuristics**: Currently stubbed with TODO comment in `lib/services/openaiService.ts:172-181`. Full implementation should:
  - Parse all multi-option requirements from the payload
  - For each requirement with >1 course option, select based on:
    - Student preferences (time-of-day, modality, work blocks)
    - Catalog constraints (prerequisites, co-requisites, repeatable limits)
    - Load balancing (spread credits evenly across terms)
  - Fallback to first valid course if no match found
  - Return warnings if no valid course available
- **Admin role assumption**: Migration assumes `role_id=1` is admin. If your schema uses a different role system, update the RLS policies in the migration file accordingly.
- **University ID type**: This implementation uses `INTEGER` for `university_id` (matching the existing `university` table with `SERIAL` primary key). If your schema uses UUID, adjust the migration and API routes.

---

## Testing Steps

1. **Run Migration:**
   ```bash
   # Apply the migration to your Supabase instance
   psql -U postgres -d your_db -f supabase/migrations/20251001_institution_settings_selection_mode.sql
   ```

2. **Verify Admin UI:**
   - Log in as admin
   - Navigate to `/dashboard/admin/settings`
   - Change mode to AUTO, save
   - Refresh page; verify mode is still AUTO

3. **Verify Student Flow (AUTO):**
   - Admin sets mode to AUTO
   - Log in as student
   - Click "Create New Plan"
   - Verify no dropdowns shown, info alert visible
   - Select a major, click "Create AI-Organized Plan"
   - Verify plan created successfully

4. **Verify Student Flow (MANUAL):**
   - Admin sets mode to MANUAL
   - Log in as student
   - Click "Create New Plan"
   - Verify all dropdowns shown, no toggle
   - Fill all dropdowns, click "Create AI-Organized Plan"
   - Verify plan created with selected courses

5. **Verify Student Flow (CHOICE):**
   - Admin sets mode to CHOICE
   - Log in as student
   - Click "Create New Plan"
   - Verify toggle visible
   - Toggle to AUTO, verify dropdowns hidden
   - Toggle to MANUAL, verify dropdowns shown
   - Create plan in each sub-mode

6. **Verify RLS:**
   - Log in as non-admin student
   - Attempt to PATCH `/api/institutions/[universityId]/settings` (via curl or Postman)
   - Verify 403 Forbidden response

---

## Diff Summary

### Added Files
- `supabase/migrations/20251001_institution_settings_selection_mode.sql`
- `lib/selectionMode.ts`
- `app/api/institutions/[universityId]/settings/route.ts`
- `app/dashboard/admin/settings/page.tsx`

### Modified Files
- `components/grad-planner/create-grad-plan-dialog.tsx`:
  - Added imports for `Switch`, `FormControlLabel`, `SelectionMode`
  - Added state for `institutionMode`, `loadingInstitutionMode`, `userChosenMode`
  - Added `useEffect` to fetch institution mode
  - Computed `effectiveMode` based on `institutionMode` and `userChosenMode`
  - Conditionally rendered course dropdowns (hidden in AUTO mode)
  - Added toggle UI for CHOICE mode
  - Updated `areAllDropdownsFilled` to bypass validation in AUTO mode
  - Attached `selectionMode` to payload in `handleCreatePlan()`

- `lib/services/openaiService.ts` (`OrganizeCoursesIntoSemesters_ServerAction`):
  - Extracted `selectionMode` from payload
  - Added branching logic with TODO for AUTO mode heuristics
  - Logs mode to console

---

## Known Limitations
- **AUTO mode course selection**: Currently no heuristics implemented; AI receives all course options and selects based on general prompt (not yet filtered/pre-selected server-side). For production, implement the TODO logic in `openaiService.ts` to pre-filter courses.
- **Admin role_id**: Hardcoded to `role_id=1` in RLS policies. Adjust if your role system differs.
- **Single institution per user**: Assumes `profiles.university_id` is a single integer. Multi-tenancy with multiple institutions per user would require a junction table and updated RLS.

---

## Contact
For questions or issues with this implementation, refer to the codebase or contact the engineering team.
