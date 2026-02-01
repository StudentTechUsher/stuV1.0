# Generate Schedule Multi-Step Dialog

## Overview

A multi-step guided dialog flow for generating class schedules in the Course Scheduler. This feature helps students create optimal schedules by walking them through personal event blocking, course selection, preference configuration, and results preview.

## Location

- **Main Component**: `components/scheduler/GenerateScheduleDialog.tsx`
- **Stepper Component**: `components/scheduler/ScheduleGenerationStepper.tsx`
- **Step Components**:
  - `components/scheduler/steps/PersonalEventsStep.tsx`
  - `components/scheduler/steps/CourseConfirmationStep.tsx`
  - `components/scheduler/steps/PreferencesStep.tsx`
  - `components/scheduler/steps/ResultsPreviewStep.tsx`

## Implementation Details

### Architecture

```
GenerateScheduleDialog
├── ScheduleGenerationStepper (progress indicator)
├── PersonalEventsStep (Step 1)
├── CourseConfirmationStep (Step 2)
├── PreferencesStep (Step 3)
└── ResultsPreviewStep (Step 4)
```

### Step Flow

1. **Personal Events** - Block off times for work, clubs, sports, etc.
   - Add multiple events with title, category, days, and times
   - View/delete added events
   - Categories: Work, Club, Sports, Study, Family, Other

2. **Course Selection** - Confirm courses from graduation plan
   - Display courses from selected term's grad plan
   - Show total credits prominently
   - Warnings for < 12 or > 18 credits
   - Ability to remove courses

3. **Preferences** - Set scheduling preferences
   - Earliest/latest class times
   - Preferred days (Mon-Fri)
   - Allow waitlist toggle
   - Time validation (earliest < latest)

4. **Preview Results** - View available course offerings
   - Fetches course sections for selected term
   - Displays instructor, times, seats, waitlist
   - Loading and error states
   - Retry functionality

### Services

**New Services Created:**

- `lib/services/generateScheduleService.ts` - Fetch course offerings for schedule generation
- `lib/utils/gradPlanHelpers.ts` - Parse grad plan data and calculate credits

**Server Actions Added:**

- `fetchCourseOfferingsForTermAction` - Fetch course sections for multiple courses

### State Management

All state is managed locally in `GenerateScheduleDialog` using React useState:

```typescript
interface ScheduleGenerationState {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps: number[];
  personalEvents: Omit<BlockedTime, 'id'>[];
  selectedCourses: string[];
  preferences: SchedulePreferences;
  totalCredits: number;
}
```

### Integration

Triggered from `course-scheduler.tsx` via "Generate Schedule" button:

```tsx
<Button
  variant="contained"
  startIcon={<Sparkles size={16} />}
  onClick={() => setGenerateDialog(true)}
  disabled={!activeScheduleId || !selectedTermName}
>
  Generate Schedule
</Button>
```

## User Experience

### Navigation

- **Forward Navigation**: "Next" button at bottom right of each step
- **Backward Navigation**: "Back" button at bottom left (steps 2-4)
- **Step Jumping**: Click completed steps in stepper to return
- **Start Over**: Button in final step to reset to step 1

### Validation

- Step 1: No validation (can skip)
- Step 2: At least one course selected
- Step 3: Earliest time < Latest time
- Step 4: No validation

### Responsive Design

- **Mobile**: Shows current step number and progress bar
- **Desktop**: Shows full stepper with all step labels
- **Colors**: Green theme matching app's primary color

## Data Flow

1. **Initialization**: Loads existing events and preferences from active schedule
2. **Course Loading**: Parses grad plan to extract courses for selected term
3. **Credit Calculation**: Updates dynamically when courses change
4. **Results Fetching**: Async fetch of course offerings on step 4
5. **Completion**: Triggers parent refresh via `onComplete` callback

## Future Enhancements

The following features are out of scope for this implementation:

- Actual scheduling algorithm/constraint solver
- Calendar preview within dialog steps
- Conflict detection highlighting
- Auto-scheduling optimization
- Multi-schedule comparison
- Schedule draft auto-save
- Adding courses not in grad plan
- Course search/autocomplete

## Technical Notes

### TypeScript Types

Uses existing types from service layer:
- `BlockedTime` - Personal events
- `SchedulePreferences` - User preferences
- `CourseSection` - Course offering details
- `GradPlanDetails` - Grad plan structure

### Error Handling

- Service calls wrapped in try-catch
- User-friendly error messages
- Retry functionality for failed fetches
- Loading states during async operations

### Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Clear focus states
- Screen reader compatible

## Testing Checklist

- [x] Build completes without errors
- [ ] Dialog opens when button clicked
- [ ] All 4 steps render correctly
- [ ] Navigation forward/backward works
- [ ] Step jumping via stepper works
- [ ] Personal events add/delete
- [ ] Course removal updates credits
- [ ] Preference validation works
- [ ] Course offerings fetch and display
- [ ] Mobile responsive layout
- [ ] Empty states handled gracefully

## Files Modified

1. `components/scheduler/course-scheduler.tsx` - Added button and dialog
2. `lib/services/server-actions.ts` - Added server action
3. Created 8 new files (dialog, stepper, 4 steps, service, helpers)

## Related Documentation

- [Course Scheduler Overview](./COURSE_SCHEDULER.md)
- [Schedule Service](../architecture/SCHEDULE_SERVICE.md)
- [Grad Plan Data Structure](../architecture/GRAD_PLAN_STRUCTURE.md)

---

**Last Updated**: 2025-01-31
**Version**: 1.0.0
**Status**: ✅ Implemented
