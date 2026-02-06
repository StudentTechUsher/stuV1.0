# Course Selection Agent - Visual Summary

## 🎯 Project Status at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                  COURSE SELECTION AGENT                     │
│                     Progress: 50%                           │
└─────────────────────────────────────────────────────────────┘

✅ COMPLETED                         ⏳ TODO
├─ Foundation (100%)                 ├─ UI Components (0%)
│  ├─ 4 Core Tools                   │  ├─ SectionSelectionCard  ← START HERE
│  ├─ Orchestrator                   │  ├─ AgentChatInterface
│  ├─ React Hook                     │  ├─ AgentMessage
│  └─ Types & Utils                  │  └─ UserMessage
│                                     │
├─ Testing (100%)                    ├─ Integration (0%)
│  ├─ 21 Tool Tests                  │  ├─ Replace Wizard
│  ├─ 20 Orchestrator Tests          │  ├─ Connect Calendar
│  └─ 3 Bugs Fixed                   │  └─ E2E Testing
│                                     │
└─ Documentation (100%)              └─ Polish (0%)
   ├─ README.md                         ├─ Error Boundaries
   ├─ TEST_RESULTS.md                   ├─ Loading States
   ├─ START_HERE.md                     ├─ Animations
   └─ IMPLEMENTATION_STATUS.md          └─ Mobile Responsive
```

---

## 📂 File Structure (What You Built)

```
lib/mastra/
├── 📘 README.md                    ← Architecture docs
├── 📗 START_HERE.md                ← Return here next session
├── 📙 TEST_RESULTS.md              ← Test coverage
├── 📕 IMPLEMENTATION_STATUS.md     ← Full roadmap
│
├── 📄 types.ts (600 lines)         ← All TypeScript types
├── 📄 courseSelectionOrchestrator.ts (450 lines)
│   └── State machine: welcome → primary → backup1 → backup2 → next course
│
├── 🔧 tools/
│   └── courseSelectionTools.ts (550 lines)
│       ├── getCourseOfferingsForCourse()
│       ├── checkSectionConflicts()      ← 4 conflict types
│       ├── rankSectionsByPreferences()  ← 0-100 scoring
│       └── addCourseSelection()
│
├── 🎨 utils/
│   ├── messageFormatting.ts (200 lines)
│   │   ├── formatSectionListMessage()
│   │   ├── formatWaitlistConfirmation()
│   │   └── formatBackupRequest()
│   └── validation.ts (150 lines)
│       ├── validateTotalCredits()
│       └── validateReasonableSchedule()
│
├── ⚛️ hooks/
│   └── useCourseSelectionOrchestrator.ts (250 lines)
│       ├── initialize()
│       ├── sendMessage()
│       ├── selectSection()
│       └── getCalendarEvents()
│
└── ✅ __tests__/
    ├── courseSelectionTools.test.ts (21 tests)
    ├── courseSelectionOrchestrator.test.ts (20 tests)
    └── mocks/
        └── supabaseMocks.ts

components/scheduler/agent/  ← CREATE THIS NEXT
└── (empty - build UI components here)
```

---

## 🔄 How the Agent Works (User Perspective)

```
┌────────────────────────────────────────────────────────────┐
│ STEP 1: Setup (Reuse existing wizard)                     │
├────────────────────────────────────────────────────────────┤
│ • Student adds personal events (work, sports, etc.)        │
│ • Student sets preferences (morning classes, MWF, etc.)    │
│ • Student clicks "Start AI Scheduler"                      │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ STEP 2: Agent Intro                                        │
├────────────────────────────────────────────────────────────┤
│ 🤖 "Hi! I'll help you schedule 5 courses for Fall 2026"   │
│ 🤖 "I'll process each course one at a time"                │
│                                                             │
│    [Let's go!]  [Cancel]                                   │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ STEP 3: Course 1 - CS 450 (Database Systems)              │
├────────────────────────────────────────────────────────────┤
│ 🤖 "Let's find a section for CS 450"                       │
│ 🤖 "Here are 5 sections ranked by your preferences:"       │
│                                                             │
│ ┌─ Section 001 - Score 95 ─────────────────────┐          │
│ │ MWF 9:00-10:00 AM • Dr. Smith                │          │
│ │ Status: Available (12 seats)                 │          │
│ │ ✅ Morning time (your preference)             │          │
│ │ ✅ MWF (your preferred days)                  │          │
│ │ ⚠️ Has Friday class                           │          │
│ │              [Select This Section]            │          │
│ └───────────────────────────────────────────────┘          │
│                                                             │
│ ┌─ Section 002 - Score 75 ─────────────────────┐          │
│ │ TTh 2:00-3:30 PM • Dr. Jones                 │          │
│ │ Status: Waitlist #5                           │          │
│ │ ⚠️ Waitlisted                                 │          │
│ │              [Select This Section]            │          │
│ └───────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────┘
                         ↓ (student clicks)
┌────────────────────────────────────────────────────────────┐
│ 🤖 "Great choice!"                                         │
│ 🤖 "Now let's pick backup #1 in case you don't get it"     │
│                                                             │
│ [Shows remaining sections...]                              │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 🤖 "Pick backup #2:"                                       │
│ [Shows remaining sections...]                              │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 🤖 "✅ CS 450 scheduled! Moving to next course..."         │
│                                                             │
│ [Calendar updates to show CS 450 on MWF 9-10am]            │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ STEP 4: Course 2 - MATH 215 (Calculus II)                 │
├────────────────────────────────────────────────────────────┤
│ [Repeat process for next course...]                        │
└────────────────────────────────────────────────────────────┘
                         ↓
                     (repeat)
                         ↓
┌────────────────────────────────────────────────────────────┐
│ STEP 5: Complete!                                          │
├────────────────────────────────────────────────────────────┤
│ 🤖 "🎉 All done! Your schedule is complete."               │
│ 🤖 "Scheduled courses:"                                     │
│    • CS 450                                                 │
│    • MATH 215                                               │
│    • ENGL 102                                               │
│    • HIST 201                                               │
│    • CHEM 101                                               │
│                                                             │
│    [View Calendar]  [Start Over]                           │
└────────────────────────────────────────────────────────────┘
```

---

## 🧠 Behind the Scenes (Technical Flow)

```
User Action                Tool Called                    State Transition
──────────────────────────────────────────────────────────────────────────
Click "Let's go!"          (none)                         welcome → fetching_sections
                              ↓
                           getCourseOfferingsForCourse()  fetching_sections
                              ↓
                           checkSectionConflicts()         (for each section)
                              ↓
                           rankSectionsByPreferences()    → awaiting_primary
                              ↓
Select Section 001         (none)                         awaiting_primary → awaiting_backup_1
                              ↓
Select Section 002         (none)                         awaiting_backup_1 → awaiting_backup_2
                              ↓
Select Section 003         (none)                         awaiting_backup_2 → saving_selection
                              ↓
                           addCourseSelection()           saving_selection → course_complete
                              ↓                            (auto-advance)
                           (auto-advance to next)         → fetching_sections (next course)
```

---

## 🎨 UI Component Hierarchy (To Build)

```
AgentSchedulerContainer
├─ SetupPanel (left side)
│  ├─ PersonalEventsStep (reuse existing)
│  ├─ PreferencesStep (reuse existing)
│  └─ StartButton
│
└─ AgentChatInterface (replaces wizard)
   ├─ ProgressHeader
   │  └─ "📚 Course 2 of 5 - MATH 215"
   │
   ├─ MessageThread
   │  ├─ AgentMessage
   │  │  ├─ MessageText (markdown support)
   │  │  ├─ SectionSelectionCard[]  ← START HERE
   │  │  │  ├─ SectionHeader (section label, score)
   │  │  │  ├─ MeetingInfo (days, times, instructor)
   │  │  │  ├─ StatusBadge (available/waitlisted)
   │  │  │  ├─ ProsList (green checkmarks)
   │  │  │  ├─ ConsList (yellow warnings)
   │  │  │  └─ SelectButton
   │  │  └─ OptionButtons (for prompts)
   │  │
   │  └─ UserMessage
   │     └─ SelectionText ("Selected Section 001")
   │
   └─ LiveCalendar (right side)
      └─ SchedulerCalendar (reuse existing)
         └─ Updates as courses are added
```

---

## 📊 What Each Tool Does

```
┌─────────────────────────────────────────────────────────────────────┐
│ Tool 1: getCourseOfferingsForCourse()                              │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  universityId, termName, courseCode                         │
│ Output: CourseSectionWithMeetings[]                                │
│                                                                     │
│ What it does:                                                       │
│ • Fetches all sections for CS 450 from database                    │
│ • Parses "MWF" → [1, 3, 5] (Monday, Wednesday, Friday)             │
│ • Returns sections with parsed meeting times                       │
│                                                                     │
│ Example:                                                            │
│ getCourseOfferingsForCourse(1, "Fall 2026", "CS 450")              │
│ → [                                                                 │
│     { offering_id: 1, section_label: "001",                         │
│       parsedMeetings: [{ days: "MWF", daysOfWeek: [1,3,5],         │
│                          startTime: "09:00", endTime: "10:00" }] }, │
│     { offering_id: 2, section_label: "002", ... }                   │
│   ]                                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Tool 2: checkSectionConflicts()                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  section, calendarEvents[], preferences                     │
│ Output: { hasConflict: boolean, conflicts: ConflictDetail[] }      │
│                                                                     │
│ What it does:                                                       │
│ • Checks if section overlaps with Work (Mon 2-5pm)                 │
│ • Checks if back-to-back with another class (< 10 min gap)         │
│ • Checks if exceeds max_daily_hours (6 hours/day)                  │
│ • Checks if blocks lunch time (12-1pm)                              │
│                                                                     │
│ Example:                                                            │
│ checkSectionConflicts(section001, [workEvent], { max_daily_hours: 6 }) │
│ → { hasConflict: false, conflicts: [] }  ✅                         │
│                                                                     │
│ checkSectionConflicts(section002, [workEvent], ...)                │
│ → { hasConflict: true,                                              │
│     conflicts: [{ conflictType: "time_overlap",                     │
│                   message: "Overlaps with Work (Mon 2-5pm)" }] }  ❌│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Tool 3: rankSectionsByPreferences()                                │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  sections[], preferences                                    │
│ Output: RankedSection[] (sorted by score)                          │
│                                                                     │
│ Scoring (0-100):                                                    │
│ • Base: 50                                                          │
│ • +20 if matches preferred_time (morning/afternoon/evening)        │
│ • +10 if matches preferred_days (MWF)                              │
│ • +10 if seats available (not waitlisted)                          │
│ • +5 if respects max_daily_hours                                   │
│ • +5 if respects lunch_break_required                              │
│ • -20 if waitlisted and allow_waitlist=false                       │
│                                                                     │
│ Example:                                                            │
│ rankSectionsByPreferences([section001, section002],                │
│   { preferred_time: "morning", preferred_days: [1,3,5] })          │
│ → [                                                                 │
│     { section: section001, score: 95,                               │
│       matchDetails: {                                               │
│         pros: ["Morning time (your preference)",                    │
│                "MWF (your preferred days)",                         │
│                "Seats available (12 open)"],                        │
│         cons: ["Has Friday class"]                                  │
│       }},                                                           │
│     { section: section002, score: 75, ... }                         │
│   ]                                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Tool 4: addCourseSelection()                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  { scheduleId, courseCode, primaryOfferingId,               │
│           backup1OfferingId, backup2OfferingId, isWaitlisted }     │
│ Output: { success: true, selectionId: "uuid" }                     │
│                                                                     │
│ What it does:                                                       │
│ • Saves to schedule_course_selections table                        │
│ • Sets status: 'planned' or 'waitlisted'                           │
│ • Returns calendar event for UI update                             │
│                                                                     │
│ Example:                                                            │
│ addCourseSelection({                                                │
│   scheduleId: "schedule-123",                                       │
│   courseCode: "CS 450",                                             │
│   primaryOfferingId: 1,                                             │
│   backup1OfferingId: 2,                                             │
│   backup2OfferingId: 3,                                             │
│   isWaitlisted: false                                               │
│ })                                                                  │
│ → { success: true, selectionId: "uuid-456" }                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

Before you continue, verify these are all ✅:

- [x] 41 tests passing (`pnpm test lib/mastra/__tests__ --run`)
- [x] No TypeScript errors in tools/orchestrator/hooks
- [x] Documentation files exist (README, START_HERE, TEST_RESULTS)
- [x] Mock data properly configured
- [x] All bugs from testing phase fixed
- [x] Git committed (if desired)

---

## 🚀 Next Session Quick Start

1. **Open** `START_HERE.md` in this folder
2. **Run** `pnpm test lib/mastra/__tests__ --run` to verify (should see 41 passing)
3. **Create** `components/scheduler/agent/SectionSelectionCard.tsx`
4. **Build** the component using the example code in START_HERE.md
5. **Test** in Storybook or by importing into a test page

**First Goal**: See a section card render with real data! 🎯

---

Made with ❤️ during testing sprint (41 tests, 3 bugs fixed, 100% passing)
