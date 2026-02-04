# AI Agent Integration Plan - Generate Schedule

## Overview

Integrate the `AgentSchedulerWithSetup` component to automatically select course sections when the user clicks "Generate Schedule" in step 4 (Preferences).

---

## Current Flow

```
Step 1: Term → Select term
Step 2: Personal Events → Add blocked times
Step 3: Courses → Confirm courses from grad plan
Step 4: Preferences → Set scheduling preferences
           ↓
    [Generate Schedule] button clicked
           ↓
    Schedule activated (is_active: true)
    Courses loaded to calendar
```

---

## New Flow with AI Agent

```
Step 1: Term → Select term
Step 2: Personal Events → Add blocked times
Step 3: Courses → Confirm courses from grad plan
Step 4: Preferences → Set scheduling preferences
           ↓
    [Generate Schedule] button clicked
           ↓
    Show AI Agent Interface (AgentSchedulerWithSetup)
           ↓
    Agent processes each course:
      - Fetches available sections
      - Filters conflicts
      - Ranks by preferences
      - User selects primary + 2 backups
           ↓
    All courses scheduled
           ↓
    Schedule activated (is_active: true)
    Calendar shows selected sections ✅
```

---

## Implementation Steps

### 1. Add Agent State to ScheduleGenerationPanel

**File:** `components/scheduler/ScheduleGenerationPanel.tsx`

**Changes:**
```typescript
// Add new state
const [showAgent, setShowAgent] = useState(false);

// Update handleCompletePreferences
const handleCompletePreferences = () => {
  // Instead of calling onComplete immediately,
  // show the agent interface
  setShowAgent(true);
};
```

---

### 2. Render Agent When Active

**File:** `components/scheduler/ScheduleGenerationPanel.tsx`

**Changes:**
```typescript
// In the render section, after step content
{showAgent && (
  <Box sx={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    bgcolor: 'background.paper',
    zIndex: 10
  }}>
    <AgentSchedulerWithSetup
      termName={termName}
      termIndex={termIndex}
      universityId={universityId}
      studentId={studentId}  // Need to pass this
      scheduleId={scheduleId} // Need to pass this
      gradPlanDetails={gradPlanDetails}
      gradPlanId={gradPlanId}
      existingPersonalEvents={state.personalEvents}
      existingPreferences={state.preferences}
      onComplete={() => {
        setShowAgent(false);
        onComplete(); // Call parent's onComplete
      }}
      onCalendarUpdate={onCalendarUpdate} // Need to add this prop
    />
  </Box>
)}
```

---

### 3. Add Required Props to ScheduleGenerationPanel

**File:** `components/scheduler/ScheduleGenerationPanel.tsx`

**Add to interface:**
```typescript
interface ScheduleGenerationPanelProps {
  // ... existing props
  studentId?: number;        // NEW
  scheduleId?: string;       // NEW
  onCalendarUpdate?: (events: SchedulerEvent[]) => void; // NEW
}
```

---

### 4. Pass Props from Parent Component

**File:** `components/scheduler/course-scheduler.tsx`

**Update ScheduleGenerationPanel usage:**
```typescript
<ScheduleGenerationPanel
  // ... existing props
  studentId={studentId}
  scheduleId={activeScheduleId}
  onCalendarUpdate={(events) => {
    // Update course events from agent selections
    const courseEventsFromAgent = events
      .filter(e => e.category === 'Course')
      .map(e => {
        const { category, ...rest } = e;
        return {
          ...rest,
          type: 'class' as const,
          status: 'planned' as const,
        };
      });
    setCourseEvents(courseEventsFromAgent);
  }}
/>
```

---

### 5. Update AgentSchedulerWithSetup Bug Fixes

**File:** `components/scheduler/agent/AgentSchedulerWithSetup.tsx`

**Ensure:**
- ✅ Infinite loop bug is fixed (already done)
- ✅ Welcome screen doesn't auto-initialize (already done)
- ✅ Uses fresh orchestrator with current data

**Verify dependencies in initialization:**
```typescript
const initializeOrchestrator = useCallback(async () => {
  // ... initialization code
}, [
  scheduleId,
  studentId,
  universityId,
  termName,
  existingPersonalEvents,
  existingPreferences,
  gradPlanDetails, // This is the key - gets fresh courses
]);
```

---

### 6. Handle Agent Completion

**File:** `components/scheduler/ScheduleGenerationPanel.tsx`

**When agent completes:**
```typescript
onComplete={() => {
  // Hide agent interface
  setShowAgent(false);

  // Call parent's onComplete which:
  // 1. Activates the schedule (is_active: true)
  // 2. Loads courses to calendar
  onComplete();
}}
```

---

## UI/UX Considerations

### 1. Agent Interface Overlay

- Agent appears as full-screen overlay on top of the panel
- Tabs are hidden while agent is active
- User cannot navigate back to other steps during agent flow
- Clear "Working on your schedule..." messaging

### 2. Progress Indicators

- Show which course is being processed (e.g., "Course 2 of 5")
- Display completed courses as chips
- Progress bar showing overall completion

### 3. Error Handling

- If agent fails, show error message with "Try Again" or "Cancel" options
- Cancel returns user to Preferences step
- Errors are logged for debugging

### 4. Completion State

- Agent shows success message: "Schedule Complete! 🎉"
- Automatically closes and shows calendar with selected courses
- Schedule is activated in database

---

## Data Flow

```
ScheduleGenerationPanel State:
  personalEvents: [] (from step 2)
  selectedCourses: [] (from step 3)
  preferences: {} (from step 4)
       ↓
AgentSchedulerWithSetup receives:
  existingPersonalEvents: personalEvents
  existingPreferences: preferences
  gradPlanDetails: (contains courses)
       ↓
CourseSelectionOrchestrator uses:
  - gradPlanCourses (from gradPlanDetails)
  - existingCalendar (converted from personalEvents)
  - preferences (for ranking)
       ↓
For each course:
  1. Fetch sections from database
  2. Filter conflicts with personalEvents
  3. Rank by preferences
  4. User selects primary + backups
  5. Save to database
       ↓
onComplete callback:
  - Hide agent
  - Activate schedule
  - Reload calendar with selections
```

---

## Files to Modify

### Primary Changes:
1. ✅ `components/scheduler/steps/PreferencesStep.tsx` - Button text (DONE)
2. ⏳ `components/scheduler/ScheduleGenerationPanel.tsx` - Add agent state and rendering
3. ⏳ `components/scheduler/course-scheduler.tsx` - Pass new props

### Verification Needed:
4. ✅ `components/scheduler/agent/AgentSchedulerWithSetup.tsx` - Bug fixes (DONE)
5. ✅ `lib/mastra/courseSelectionOrchestrator.ts` - Working correctly (DONE)
6. ✅ `lib/mastra/tools/courseSelectionTools.ts` - All tools functional (DONE)

---

## Testing Checklist

### Before Integration:
- [ ] Verify steps 1-4 work correctly
- [ ] Confirm preferences are saved
- [ ] Check personal events are in state

### After Integration:
- [ ] Click "Generate Schedule" shows agent interface
- [ ] Agent receives correct data (courses, events, preferences)
- [ ] Agent can fetch sections for each course
- [ ] Conflict detection works with personal events
- [ ] Section ranking respects preferences
- [ ] User can select primary + backups
- [ ] Selections save to database
- [ ] Calendar updates with selected courses
- [ ] Schedule is activated when complete
- [ ] Cannot navigate back during agent flow

### Edge Cases:
- [ ] No courses in grad plan → Show error
- [ ] No sections available → Skip or show warning
- [ ] All sections conflict → Show options
- [ ] Agent crashes → Error handling works
- [ ] User has no personal events → Agent still works
- [ ] User has no preferences set → Default values work

---

## Rollback Plan

If agent integration causes issues:

1. **Immediate rollback:**
   - Comment out agent rendering in ScheduleGenerationPanel
   - Change button back to "Next: Preview Results"
   - Restore original onComplete behavior

2. **Fallback flow:**
   - Keep using ScheduleGenerationPanel without agent
   - Manual course selection (if needed)
   - Schedule activates immediately on completion

---

## Success Criteria

✅ User completes steps 1-4
✅ Clicks "Generate Schedule"
✅ Agent interface appears
✅ Agent processes all courses automatically
✅ User selects sections through conversational UI
✅ All selections save to database
✅ Calendar shows scheduled courses
✅ Schedule is marked as active
✅ No crashes or errors

---

## Next Steps

1. Review this plan
2. Make any adjustments needed
3. Implement changes file-by-file
4. Test each step thoroughly
5. Commit when working

---

**Estimated Implementation Time:** 30-45 minutes
**Complexity:** Medium
**Risk Level:** Low (can easily rollback)
