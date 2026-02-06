# Course Selection Agent (Hybrid Approach)

This module provides an AI-guided course scheduling system that helps students select course sections one at a time, with intelligent conflict detection and preference-based ranking.

## Architecture

This uses a **hybrid approach** - combining custom tools with a simple state machine orchestrator, avoiding the complexity of full Mastra agent framework.

### Components

1. **Tools** (`tools/courseSelectionTools.ts`) - 4 core functions:
   - `getCourseOfferingsForCourse` - Fetch all sections for a course
   - `checkSectionConflicts` - Detect time overlaps, back-to-back conflicts, daily hour limits, lunch breaks
   - `rankSectionsByPreferences` - Score sections 0-100 based on user preferences with pros/cons
   - `addCourseSelection` - Save selections to database

2. **Orchestrator** (`courseSelectionOrchestrator.ts`) - State machine that:
   - Processes courses one-by-one in sequence
   - Manages conversation flow (primary → waitlist confirmation → backup 1 → backup 2)
   - Handles edge cases (no valid sections, errors, skipping)
   - Updates calendar in real-time

3. **React Hook** (`hooks/useCourseSelectionOrchestrator.ts`) - Clean API for components:
   - Manages orchestrator lifecycle
   - Provides message thread for UI
   - Exposes actions (selectSection, skipCourse, reset)
   - Auto-updates calendar events

4. **Types** (`types.ts`) - Comprehensive TypeScript definitions
5. **Utilities** (`utils/`) - Message formatting and validation helpers

## Usage Example

```typescript
import { useCourseSelectionOrchestrator } from '@/lib/mastra/hooks/useCourseSelectionOrchestrator';

function CourseScheduler() {
  const {
    messages,
    isProcessing,
    currentState,
    selectSection,
    getCalendarEvents,
    getProgressIndicator,
  } = useCourseSelectionOrchestrator({
    scheduleId: 'schedule-123',
    studentId: 456,
    universityId: 1,
    termName: 'Fall 2026',
    gradPlanCourses: ['CS 450', 'MATH 215', 'ENGL 102'],
    preferences: {
      earliest_class_time: '09:00',
      latest_class_time: '17:00',
      preferred_days: [1, 3, 5], // MWF
      allow_waitlist: true,
      max_daily_hours: 6,
    },
    existingCalendar: [], // Personal events
  });

  return (
    <div>
      <h2>{getProgressIndicator()}</h2>

      {/* Message thread */}
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.type === 'agent' ? (
            <AgentMessage content={msg.content} onSelectSection={selectSection} />
          ) : (
            <UserMessage content={msg.content} />
          )}
        </div>
      ))}

      {/* Live calendar */}
      <Calendar events={getCalendarEvents()} />
    </div>
  );
}
```

## Flow Diagram

```
1. Welcome Message
   ↓ (user clicks "Let's go!")
2. Fetch sections for Course 1 (e.g., CS 450)
   ↓
3. Filter out conflicting sections
   ↓
4. Rank sections by preferences (score 0-100)
   ↓
5. Show top 5 sections with pros/cons
   ↓ (user selects Section 001)
6. If waitlisted → Ask "Join waitlist?"
   ↓ (user says yes)
7. Ask for 2nd backup section
   ↓ (user selects Section 002)
8. Ask for 3rd backup section
   ↓ (user selects Section 003)
9. Save to database
   ↓
10. Add to calendar (live update)
   ↓
11. Show "✅ CS 450 scheduled! Moving to next course..."
   ↓
12. Repeat for Course 2 (MATH 215)
   ↓
... continue for all courses ...
   ↓
13. "🎉 All done! Your schedule is complete."
```

## Key Features

### Conflict Detection
- **Time overlap** - Section meets at same time as personal event or another course
- **Back-to-back** - Less than 10 min gap between classes in different buildings
- **Daily hour limits** - Adding section would exceed max_daily_hours preference
- **Lunch breaks** - Section blocks lunch time when lunch_break_required is true

### Preference-Based Ranking

Sections scored 0-100:
- Base score: 50
- +20 if time slot matches preferred time (morning/afternoon/evening)
- +10 if meets on preferred days (e.g., MWF)
- +10 if seats available (not waitlisted)
- +5 if respects max_daily_hours
- +5 if respects lunch break
- -20 if waitlisted and allow_waitlist = false

Each section shows:
- ✅ **Pros** - "Morning time slot (your preference)", "MWF (preferred days)", "12 seats available"
- ⚠️ **Cons** - "Waitlisted (position #5)", "Friday class", "Blocks lunch time"

### Error Handling

- **No valid sections** - Offers to choose different course or skip
- **Tool errors** - Gracefully catches and shows user-friendly message
- **Network failures** - Retry or skip options
- **User closes tab** - Can resume (state persisted in orchestrator)

## Testing

### Unit Tests (Recommended Next Step)

Test each tool independently:

```typescript
// Example: Test conflict detection
describe('checkSectionConflicts', () => {
  it('detects time overlap', async () => {
    const section = {
      parsedMeetings: [{ days: 'MWF', daysOfWeek: [1, 3, 5], startTime: '09:00', endTime: '10:00' }],
    };
    const calendar = [
      { dayOfWeek: 1, startTime: '09:30', endTime: '10:30', title: 'Work' },
    ];
    const result = await checkSectionConflicts(section, calendar, {});

    expect(result.hasConflict).toBe(true);
    expect(result.conflicts[0].conflictType).toBe('time_overlap');
  });

  it('allows non-overlapping section', async () => {
    const section = {
      parsedMeetings: [{ days: 'MWF', daysOfWeek: [1, 3, 5], startTime: '08:00', endTime: '09:00' }],
    };
    const calendar = [
      { dayOfWeek: 1, startTime: '09:30', endTime: '10:30', title: 'Work' },
    ];
    const result = await checkSectionConflicts(section, calendar, {});

    expect(result.hasConflict).toBe(false);
  });
});
```

### Integration Tests

Test the orchestrator flow:

```typescript
describe('CourseSelectionOrchestrator', () => {
  it('completes full flow for one course', async () => {
    const orchestrator = new CourseSelectionOrchestrator({ ... });

    // Start
    const welcome = await orchestrator.start();
    expect(welcome.text).toContain('Let\'s go!');

    // Select primary
    const response1 = await orchestrator.processUserInput({ sectionId: 123 });
    expect(response1.text).toContain('backup');

    // ... continue flow
  });
});
```

## Next Steps

1. **Write unit tests** for the 4 tools (see examples above)
2. **Build UI components** - AgentChatInterface, SectionSelectionCard, etc.
3. **Integrate with scheduler** - Replace ScheduleGenerationPanel with agent UI
4. **Add caching** - Cache course offerings for session (React Query)
5. **Polish** - Error boundaries, loading states, animations

## File Structure

```
lib/mastra/
├── types.ts                          # TypeScript definitions
├── courseSelectionOrchestrator.ts    # State machine orchestrator
├── README.md                         # This file
├── tools/
│   └── courseSelectionTools.ts       # 4 core tools
├── utils/
│   ├── messageFormatting.ts          # Agent message formatters
│   └── validation.ts                 # Credit/schedule validation
└── hooks/
    └── useCourseSelectionOrchestrator.ts  # React hook
```

## Why Hybrid Approach?

We chose this over full Mastra because:
- ✅ **Simpler** - No complex agent configuration, easier to understand
- ✅ **Testable** - Tools are pure functions, easy to unit test
- ✅ **Flexible** - Can swap orchestrator without changing tools
- ✅ **No dependencies** - Avoids Zod v3 compatibility issues with Mastra
- ✅ **Lightweight** - Smaller bundle, faster load times
- ✅ **Maintainable** - Clear separation of concerns, follows service layer pattern

The tools are generic enough that if you later want to switch to full Mastra, OpenAI Assistants API, or another framework, you can reuse them without modification.
