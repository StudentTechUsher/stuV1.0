# AI-Guided Course Scheduler

## Overview

The AI-Guided Course Scheduler provides an interactive, conversational interface for students to build their semester schedule. It uses a state machine orchestrator to guide students through selecting courses one at a time, ensuring no conflicts and respecting preferences.

## Architecture

### Components

```
components/scheduler/agent/
├── AgentSchedulerWithSetup.tsx     # Main conversational UI component
├── SectionSelectionCard.tsx        # UI for displaying section options
├── AgentSchedulerWithSetup.stories.tsx
├── SectionSelectionCard.stories.tsx
└── index.ts                        # Barrel exports
```

### Core Logic

```
lib/mastra/
├── courseSelectionOrchestrator.ts  # State machine managing selection flow
├── tools/
│   └── courseSelectionTools.ts     # Core business logic tools
├── utils/
│   └── messageFormatting.ts        # Agent message formatting
└── types.ts                        # TypeScript type definitions
```

## How It Works

### 1. Initialization

When a student selects a term, `AgentSchedulerWithSetup` component:
1. Extracts courses from the graduation plan for that term
2. Converts existing personal events to calendar format
3. Creates a `CourseSelectionOrchestrator` instance
4. Starts the session with a welcome message

### 2. Course-by-Course Flow

The orchestrator processes courses sequentially:

```
Welcome → Course 1 → Course 2 → ... → Course N → Complete
          ↓          ↓                ↓
          Primary    Primary          Primary
          ↓          ↓                ↓
          Backup 1   Backup 1         Backup 1
          ↓          ↓                ↓
          Backup 2   Backup 2         Backup 2
```

For each course:
1. **Fetch sections** - Get all available sections from database
2. **Filter conflicts** - Remove sections that overlap with calendar
3. **Rank by preferences** - Score sections based on user preferences
4. **Present options** - Show top 5 sections with pros/cons
5. **User selects** - Student picks primary section
6. **Waitlist check** - Confirm if section is waitlisted
7. **Select backups** - Choose 2 backup sections
8. **Save to database** - Store selection with backups
9. **Update calendar** - Add course to visual calendar
10. **Move to next** - Auto-advance to next course

### 3. State Machine Phases

The orchestrator manages these phases:

| Phase | Description | User Action |
|-------|-------------|-------------|
| `welcome` | Initial greeting | Click "Let's go!" |
| `fetching_sections` | Loading course data | Wait |
| `awaiting_primary` | Selecting main section | Click section card |
| `awaiting_waitlist_confirmation` | Confirm waitlist | Yes/No |
| `awaiting_backup_1` | Select first backup | Click section card |
| `awaiting_backup_2` | Select second backup | Click section card |
| `saving_selection` | Saving to database | Wait |
| `course_complete` | Course done | Auto-advance |
| `session_complete` | All courses done | Restart or exit |
| `error` | Error occurred | Retry or skip |

## Tools

### 1. getCourseOfferingsForCourse

Fetches available sections for a course code.

```typescript
const sections = await getCourseOfferingsForCourse(
  universityId,
  termName,
  courseCode
);
```

**Returns:** Array of `CourseSectionWithMeetings` with parsed meeting times

### 2. checkSectionConflicts

Checks if a section conflicts with the current calendar.

```typescript
const result = await checkSectionConflicts(
  section,
  currentCalendar,
  preferences
);
```

**Conflict Types:**
- `time_overlap` - Section meets at same time as existing event
- `back_to_back` - Less than 10 min between events in different buildings
- `exceeds_daily_hours` - Would exceed max daily hours preference
- `blocks_lunch` - Overlaps with lunch break requirement

**Returns:** `{ hasConflict: boolean, conflicts: ConflictDetail[] }`

### 3. rankSectionsByPreferences

Scores and ranks sections by preference match (0-100).

```typescript
const ranked = await rankSectionsByPreferences(
  nonConflictingSections,
  preferences
);
```

**Scoring Algorithm:**
- Base score: 50
- +20 if time matches preferred_time (morning/afternoon/evening)
- +10 if days match preferred_days
- +10 if seats available
- +5 if respects max_daily_hours
- +5 if respects lunch_break_required
- -20 if waitlisted and allow_waitlist = false

**Returns:** Array of `RankedSection` sorted by score descending

### 4. addCourseSelection

Saves the course selection to the database.

```typescript
const result = await addCourseSelection({
  scheduleId,
  courseCode,
  primaryOfferingId,
  backup1OfferingId,
  backup2OfferingId,
  isWaitlisted,
});
```

**Returns:** `{ success: boolean, selectionId?: string, error?: string }`

## UI Components

### AgentSchedulerWithSetup

Main component providing the conversational interface.

**Props:**
```typescript
interface AgentSchedulerWithSetupProps {
  termName: string;
  termIndex: number;
  universityId: number;
  studentId: number;
  scheduleId: string;
  gradPlanDetails: GradPlanDetails | null;
  gradPlanId?: string;
  existingPersonalEvents: Array<PersonalEvent>;
  existingPreferences: SchedulePreferences;
  onComplete?: () => void;
  onCalendarUpdate?: (events: SchedulerEvent[]) => void;
}
```

**Features:**
- Progress indicator showing X/Y courses complete
- Collapsible message history
- Auto-scroll to latest message
- Loading states and error handling
- Restart capability

### SectionSelectionCard

Displays a course section option with ranking details.

**Props:**
```typescript
interface SectionSelectionCardProps {
  section: CourseSectionWithMeetings;
  ranking: RankedSection;
  onSelect: (section: CourseSectionWithMeetings) => void;
  disabled?: boolean;
}
```

**Displays:**
- Section number and score badge
- Meeting times and location
- Instructor and credits
- Availability status (seats/waitlist)
- Pros (green checkmarks)
- Cons (yellow warnings)
- Select button

## Usage Example

```tsx
import { AgentSchedulerWithSetup } from '@/components/scheduler/agent';

function MyScheduler() {
  return (
    <AgentSchedulerWithSetup
      termName="Fall 2026"
      termIndex={0}
      universityId={1}
      studentId={123}
      scheduleId="schedule-123"
      gradPlanDetails={planDetails}
      existingPersonalEvents={personalEvents}
      existingPreferences={preferences}
      onComplete={() => console.log('Done!')}
      onCalendarUpdate={(events) => setCalendar(events)}
    />
  );
}
```

## User Experience Flow

1. **Student selects term** from graduation plan
2. **Agent greets** and shows courses to schedule
3. **Student clicks "Let's go!"**
4. For each course:
   - Agent shows available sections with scores
   - Highlights best matches in green
   - Shows conflicts/issues in yellow
   - Student selects primary section
   - If waitlisted, confirms acceptance
   - Student selects 2 backup sections
   - Agent saves and adds to calendar
   - Auto-advances to next course
5. **Completion screen** shows all scheduled courses
6. **Calendar updates** in real-time on the right panel

## Preferences Integration

The agent respects these preferences from `SchedulePreferences`:

| Preference | Effect |
|------------|--------|
| `earliest_class_time` | Filters out earlier sections |
| `latest_class_time` | Filters out later sections |
| `preferred_days` | Boosts score for matching days |
| `avoid_days` | Penalizes score for these days |
| `max_daily_hours` | Marks conflicts if exceeded |
| `lunch_break_required` | Marks conflicts during lunch |
| `lunch_start_time` | Start of lunch window |
| `lunch_end_time` | End of lunch window |
| `allow_waitlist` | Penalizes waitlisted if false |

## Error Handling

### No Courses in Grad Plan
Shows error: "No courses found in your graduation plan for this term."

### No Available Sections
When all sections conflict:
- Shows "No valid sections" message
- Options: Skip course or Exit

### API/Database Errors
- Displays error alert
- Options: Retry or Skip course
- Logs error to console

## Testing

### Storybook Stories

Both components have comprehensive Storybook stories:

```bash
# View in Storybook
npm run storybook

# Navigate to:
# - Scheduler/Agent/AgentSchedulerWithSetup
# - Scheduler/Agent/SectionSelectionCard
```

**Story Variants:**
- Default (happy path)
- Waitlisted sections
- Full sections
- Many pros/cons
- Online/async courses
- Low score sections
- Busy schedules
- Error states

### Manual Testing

1. Create a test graduation plan with 3-5 courses
2. Add some personal events (work, clubs, etc.)
3. Set preferences (preferred times, lunch break, etc.)
4. Start the agent and go through the flow
5. Verify:
   - Conflict detection works
   - Ranking reflects preferences
   - Calendar updates correctly
   - Backups save properly

## Future Enhancements

### Potential Improvements

1. **Smart Recommendations** - "We recommend Section 001 because..."
2. **Multi-Select Backup** - Select both backups at once
3. **Preview Mode** - See full schedule before saving
4. **Undo Last Course** - Go back and reselect
5. **Export Summary** - Download schedule as PDF/ICS
6. **Conflict Resolution** - Suggest moving personal events
7. **Professor Ratings** - Integrate RateMyProfessor data
8. **GE Requirements** - Highlight which requirement each course satisfies
9. **Credit Balance** - Show total credits and warn if under/over
10. **Time Blocks** - Visualize schedule as calendar during selection

### Status

⚠️ **CURRENTLY DISABLED** - The agent scheduler skips important setup steps (personal events, preferences, course confirmation). The original `ScheduleGenerationPanel` component is being used instead, which provides the complete workflow.

## Issues to Address Before Re-enabling

1. **Missing multi-step flow** - Needs to include:
   - Step 1: Add personal events (work, clubs, sports, etc.)
   - Step 2: Set schedule preferences (time ranges, lunch breaks, etc.)
   - Step 3: Review and confirm courses from grad plan
   - Step 4: AI-guided section selection (current implementation)

2. **UI/UX improvements needed**:
   - Better visual design (robot emoji flagged as "creepy")
   - Move "Scheduling for [Term]" info into component
   - Better progress indicators for multi-step flow

3. **Technical debt**:
   - Infinite loop bug fixed ✅
   - Type compatibility issues resolved ✅
   - Storybook integration completed ✅

## Known Limitations

- No support for multi-term planning (one term at a time)
- Can't edit selections after completion (must restart)
- Doesn't consider course prerequisites
- No integration with degree audit system
- Limited to courses in graduation plan (can't add extras)

## Related Files

- `lib/services/scheduleService.ts` - Database operations
- `lib/services/generateScheduleService.ts` - Course fetching
- `lib/services/courseOfferingService.ts` - Course offering types
- `components/scheduler/course-scheduler.tsx` - Parent container
- `components/scheduler/scheduler-calendar.tsx` - Visual calendar

## References

- [Service Layer Pattern (CLAUDE.md)](../../CLAUDE.md#2-database-operations---service-layer-pattern)
- [Mastra Documentation](https://mastra.ai/docs)
- [Course Selection Orchestrator](../../lib/mastra/courseSelectionOrchestrator.ts)
