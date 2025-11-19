# Grad Plan Wizard UI - Implementation Guide

## ✅ Completed

### Core Infrastructure
- ✅ `WizardContainer.tsx` - Main layout wrapper with header, progress bar, and form area
- ✅ `WizardProgressBar.tsx` - Clean progress indicator (step X of Y + percentage)
- ✅ `WizardFormLayout.tsx` - Standardized form card layout
- ✅ `OptionTile.tsx` - Reusable selectable option tile with checkmark
- ✅ `WizardScreenRouter.tsx` - Screen routing logic

### Implemented Screens
- ✅ `NameScreen.tsx` - "What's your name?" (pre-filled from profile)
- ✅ `GraduationDateScreen.tsx` - "When do you plan to graduate?" (date picker)
- ✅ `GraduationSemesterScreen.tsx` - "Which semester?" (Fall/Spring/Summer/Winter tiles)
- ✅ `CareerGoalsScreen.tsx` - "What are your career goals?" (optional text area)
- ✅ `TranscriptScreen.tsx` - "Do you have a transcript?" (Yes/No tiles)
- ✅ `StudentTypeScreen.tsx` - "What type of student?" (Undergraduate/Graduate tiles)

### Refactored CreatePlanClient
- ✅ Replaced chat interface with wizard layout
- ✅ Split profile into 4 screens with profile sub-step tracking
- ✅ Removed sidebar and message threading
- ✅ Preserved all state management and backend logic
- ✅ Kept all server actions and validation intact

---

## ⏳ Remaining Implementation

### 1. ProgramSelectionForm Screen (`components/grad-plan/screens/ProgramSelectionScreen.tsx`)

**Current Implementation**: In `/components/chatbot-tools/ProgramSelectionForm.tsx` (~300+ lines)

**Wizard Version Needs**:
- Search/filter functionality to avoid overwhelming lists
- Separate screens for:
  - Undergraduates: Major selection
  - Undergraduates: Minor selection (optional)
  - Undergraduates: Gen-Ed selection (optional)
  - Graduates: Program selection
- Display selected programs as pills below selections
- Show count of selected items

**Key Data**:
- Props: `studentType`, `universityId`, `programsData`
- Handlers: `onSubmit`, `onBack`
- State: Track selected program IDs by type (major/minor/gen-ed)

**Screen Layout**:
```
Title: "What's your major?" (or "Select your programs?" for grad)
Subtext: "Choose the degree program(s) for your goal."

[Search box: "Search programs..."]

[List of programs with checkboxes, 6-8 visible at a time]
[Scroll to load more]

[Selected programs as pills/tags below]
"Selected: 3 programs"

[← Back] [Continue →]
```

**Approach**:
1. Keep existing ProgramSelectionForm logic (validation, data transformation)
2. Create wizard-styled wrapper screen
3. Use search to manage large program lists
4. Break into multiple screens if needed (major → minor → gen-ed for undergrad)

---

### 2. CourseSelectionForm Screen (`components/grad-plan/screens/CourseSelectionScreen.tsx`)

**Current Implementation**: In `/components/chatbot-tools/CourseSelectionForm.tsx` (~400+ lines)

**Wizard Version Needs**:
- Organize courses by requirement type (required vs elective)
- Group by program for clarity
- Show course count and selection progress
- Allow filtering/searching by course code or name
- Optional: Lazy load courses to avoid overwhelming UI

**Key Data**:
- Props: `studentType`, `universityId`, `selectedPrograms`
- Handlers: `onSubmit`, `onBack`
- State: Track selected courses, expand/collapse sections

**Screen Layout**:
```
Title: "Select your courses"
Subtext: "Choose from courses required for your degree."

[Search/filter box: "Find courses..."]

[Expandable Sections]

Required Courses (15 courses)
├─ [□] Calculus I
├─ [□] Data Structures
├─ [□] Chemistry I
└─ ... (show 5-6, scroll for more)

Electives (12 courses)
├─ [□] AI Fundamentals
├─ [□] Web Development
└─ ... (collapsed by default)

Progress: "Selected 8 of 15 required"

[← Back] [Continue →]
```

**Approach**:
1. Keep existing CourseSelectionForm validation and data handling
2. Add search/filter functionality
3. Organize into collapsible sections by requirement type
4. Show selection count and progress
5. Use lazy loading or virtualization if needed for large course lists

---

### 3. AdditionalConcernsForm Screen (`components/grad-plan/screens/AdditionalConcernsScreen.tsx`)

**Current Implementation**: In `/components/chatbot-tools/AdditionalConcernsForm.tsx` (~100 lines)

**Wizard Version Needs**:
- Simple optional text area
- Skip button (optional step)
- Character counter optional but nice

**Screen Layout**:
```
Title: "Any special requests?"
Subtext: "Tell us if there's anything we should know."

[Text area for concerns]

[← Back] [Skip] [Continue →]
```

**Approach**:
1. Similar to CareerGoalsScreen
2. Keep it simple and minimal
3. Make skip button prominent

---

### 4. Plan Generation/Loading Screen (`components/grad-plan/screens/GeneratingPlanScreen.tsx`)

**Current Behavior**: Currently skips ADDITIONAL_CONCERNS and goes directly to GENERATING_PLAN

**Wizard Version Needs**:
- Animated loading indicator
- Sequential progress messages
- Loading states show what's happening

**Screen Layout**:
```
Title: "Building your plan..."
Subtext: "This should take just a moment."

[Animated spinner or pulsing dots]

Progress messages (appear sequentially):
✓ Gathering your information
✓ Analyzing degree requirements
◇ Organizing courses into semesters
◇ Finalizing your plan

[Auto-redirect on completion to /grad-plan/{accessId}]
```

**Key Logic**:
1. Call existing `organizeCoursesIntoSemestersAction` (unchanged)
2. Show loading messages based on progress
3. Auto-redirect to `/grad-plan/{accessId}` on success
4. Handle errors gracefully with retry option

---

## Integration Steps

### Step 1: Update CreatePlanClient

Add screen handlers for remaining steps:

```typescript
const handleProgramSelectionSubmit = async (data: unknown) => {
  // Similar to existing profile handlers
  // Update conversation state
  // Move to next step
};

const handleCourseSelectionSubmit = async (data: unknown) => {
  // Track selected courses
  // If additional concerns needed, move to that step
  // Otherwise, jump to generating plan
};

const handleAdditionalConcernsSubmit = async (data: unknown) => {
  // Optional step
  // Update state
  // Move to generating plan
};

const handleAdditionalConcernsSkip = async () => {
  // Skip and go directly to generating plan
};
```

### Step 2: Add Screen Routing

In `renderCurrentScreen()` method, add cases for:
- `ConversationStep.PROGRAM_SELECTION`
- `ConversationStep.COURSE_SELECTION`
- `ConversationStep.ADDITIONAL_CONCERNS`
- `ConversationStep.GENERATING_PLAN`

### Step 3: Update Progress Tracking

Update `getCurrentStepNumber()` to properly track progress:

```typescript
const stepNumbers: Record<ConversationStep, number> = {
  // ... existing
  [ConversationStep.PROGRAM_SELECTION]: 7,
  [ConversationStep.COURSE_SELECTION]: 8,
  [ConversationStep.ADDITIONAL_CONCERNS]: 9,
  [ConversationStep.GENERATING_PLAN]: 10,
  // ...
};
```

---

## Design Consistency

All wizard screens should follow:

1. **Layout**: Use `WizardFormLayout` component
2. **Options**: Use `OptionTile` for selections
3. **Input Fields**: Clean borders, indigo focus state
4. **Buttons**: Back (outline), Continue/Submit (indigo primary)
5. **Spacing**: Consistent padding and gaps
6. **Typography**: Title (2xl/3xl), subtitle (sm gray)

---

## State Management (Unchanged)

All state management remains in:
- `/lib/chatbot/grad-plan/stateManager.ts`
- `/lib/chatbot/grad-plan/conversationState.ts`
- `/lib/chatbot/grad-plan/statePersistence.ts`

No changes needed to backend logic.

---

## Testing Checklist

- [ ] Full wizard flow works end-to-end
- [ ] All data persists to localStorage
- [ ] Back navigation preserves data correctly
- [ ] Profile pre-fill works
- [ ] Server actions execute properly
- [ ] Plan generation redirects correctly
- [ ] Mobile responsive on all breakpoints
- [ ] Accessibility: keyboard nav, focus states, color contrast
- [ ] Form validation works
- [ ] No console errors

---

## Implementation Priority

1. **High**: ProgramSelectionForm (step before course selection)
2. **High**: CourseSelectionForm (critical step)
3. **Medium**: AdditionalConcernsForm (optional but nice)
4. **High**: GeneratingPlanScreen (final step with redirect)
5. **Polish**: Mobile responsiveness and styling refinements

---

## Notes

- All existing validation logic from form components should be preserved
- No changes to service layer or database operations
- Only the UI presentation layer is being redesigned
- Focus on minimizing cognitive load and making each screen focused on one question
- Keep consistent with Figma.com onboarding aesthetic
