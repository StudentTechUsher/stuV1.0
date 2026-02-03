# 🚀 Start Here - Course Selection Agent

**Last Updated**: 2025 (after completing Phase 1 + Testing)

This guide helps you pick up where you left off on the **Mastra Course Selection Agent** implementation.

---

## 📍 Current Status: Ready for UI Development

### ✅ What's Complete (50% Done)

**Phase 1: Foundation** ✅
- [x] 4 core tools (conflict detection, ranking, fetching, saving)
- [x] Simple orchestrator (state machine for course-by-course flow)
- [x] React hook for state management
- [x] Type definitions (20+ interfaces)
- [x] Message formatting utilities
- [x] Validation helpers
- [x] **41 passing unit tests** 🎉

**Phase 2: Testing** ✅
- [x] Tool tests (21 tests - conflict detection, ranking, etc.)
- [x] Orchestrator tests (20 tests - state machine, flow control)
- [x] All edge cases covered
- [x] 3 bugs found and fixed during testing

### 🏗️ What's Next (50% Remaining)

**Phase 3: UI Components** ⏳ **← START HERE**
- [ ] Build `SectionSelectionCard.tsx` component
- [ ] Build `AgentChatInterface.tsx` component
- [ ] Build message display components
- [ ] Test in Storybook

**Phase 4: Integration** ⏳
- [ ] Replace `ScheduleGenerationPanel` with agent UI
- [ ] Connect to existing calendar
- [ ] Test end-to-end flow

**Phase 5: Polish** ⏳
- [ ] Error boundaries
- [ ] Loading states
- [ ] Animations
- [ ] Mobile responsive
- [ ] Accessibility

---

## 🎯 When You Come Back: Next Steps

### Step 1: Refresh Your Memory (5 minutes)

Read these in order:
1. **`lib/mastra/README.md`** - Architecture overview and usage examples
2. **`lib/mastra/TEST_RESULTS.md`** - What's been validated
3. **`IMPLEMENTATION_STATUS.md`** - Full roadmap

### Step 2: Verify Everything Still Works (2 minutes)

```bash
# Run all tests to confirm nothing broke
pnpm test lib/mastra/__tests__ --run

# Expected: ✅ 41 tests passing
```

If tests fail, check git history for any changes.

### Step 3: Start Building UI (Start Here!)

**Recommended First Component**: `SectionSelectionCard.tsx`

This component shows a single course section with:
- Section details (time, instructor, location)
- Availability badge (Available/Waitlist #X/Full)
- Pros/cons from ranking (green ✅ and yellow ⚠️)
- Score (0-100)
- "Select This Section" button

**Why start here?**
- Self-contained (doesn't need full chat interface)
- Can test in Storybook
- Reusable in main chat interface
- Visual progress feels good!

---

## 📂 Key Files Reference

### Core Implementation

| File | Purpose | Lines |
|------|---------|-------|
| `lib/mastra/types.ts` | TypeScript definitions | 600+ |
| `lib/mastra/tools/courseSelectionTools.ts` | 4 core tools | 550+ |
| `lib/mastra/courseSelectionOrchestrator.ts` | State machine | 450+ |
| `lib/mastra/hooks/useCourseSelectionOrchestrator.ts` | React hook | 250+ |
| `lib/mastra/utils/messageFormatting.ts` | Message formatters | 200+ |

### Tests

| File | Tests | Purpose |
|------|-------|---------|
| `lib/mastra/__tests__/courseSelectionTools.test.ts` | 21 | Tool validation |
| `lib/mastra/__tests__/courseSelectionOrchestrator.test.ts` | 20 | State machine validation |
| `lib/mastra/__tests__/mocks/supabaseMocks.ts` | - | Mock data |

### Documentation

| File | Purpose |
|------|---------|
| `lib/mastra/README.md` | Architecture, usage examples, flow diagram |
| `lib/mastra/TEST_RESULTS.md` | Test coverage, bugs fixed, confidence level |
| `IMPLEMENTATION_STATUS.md` | Full roadmap, phases, timeline |
| `START_HERE.md` | This file - quick start guide |

---

## 🎨 UI Development Guide

### Component 1: SectionSelectionCard.tsx

**Location**: `components/scheduler/agent/SectionSelectionCard.tsx`

**Props Interface**:
```typescript
interface SectionSelectionCardProps {
  section: CourseSectionWithMeetings;
  ranking: RankedSection;
  onSelect: (section: CourseSectionWithMeetings) => void;
  disabled?: boolean;
}
```

**Visual Design**:
```
┌─────────────────────────────────────┐
│ Section 001 - Score: 95            │
│ MWF 9:00-10:00 AM • Dr. Smith      │
│ Building A Room 101                │
│                                     │
│ Status: Available (12 seats)       │
│                                     │
│ ✅ Morning time (your preference)   │
│ ✅ MWF (your preferred days)        │
│ ✅ Seats available (12 open)        │
│ ⚠️  Has Friday class                │
│                                     │
│      [Select This Section]         │
└─────────────────────────────────────┘
```

**Implementation Steps**:
1. Create file: `components/scheduler/agent/SectionSelectionCard.tsx`
2. Import types from `lib/mastra/types.ts`
3. Use MUI `Card`, `Button`, `Chip` components
4. Style with Tailwind or MUI sx prop
5. Test in Storybook

**Example Code Structure**:
```typescript
'use client';

import { Card, CardContent, Button, Chip, Stack, Typography } from '@mui/material';
import type { CourseSectionWithMeetings, RankedSection } from '@/lib/mastra/types';

interface SectionSelectionCardProps {
  section: CourseSectionWithMeetings;
  ranking: RankedSection;
  onSelect: (section: CourseSectionWithMeetings) => void;
  disabled?: boolean;
}

export function SectionSelectionCard({ section, ranking, onSelect, disabled }: SectionSelectionCardProps) {
  const { matchDetails, score } = ranking;

  return (
    <Card sx={{ mb: 2, opacity: disabled ? 0.5 : 1 }}>
      <CardContent>
        {/* Section header */}
        <Typography variant="h6">
          Section {section.section_label} - Score: {score}
        </Typography>

        {/* Meeting times */}
        {section.parsedMeetings?.map((meeting, idx) => (
          <Typography key={idx}>
            {meeting.days} {meeting.startTime}-{meeting.endTime} • {section.instructor}
          </Typography>
        ))}

        {/* Availability badge */}
        <Chip
          label={matchDetails.waitlistStatus === 'available'
            ? `Available (${section.seats_available} seats)`
            : `Waitlist #${section.waitlist_count}`
          }
          color={matchDetails.waitlistStatus === 'available' ? 'success' : 'warning'}
        />

        {/* Pros */}
        <Stack spacing={0.5} mt={2}>
          {matchDetails.pros.map((pro, idx) => (
            <Typography key={idx} color="success.main">
              ✅ {pro}
            </Typography>
          ))}
        </Stack>

        {/* Cons */}
        <Stack spacing={0.5} mt={1}>
          {matchDetails.cons.map((con, idx) => (
            <Typography key={idx} color="warning.main">
              ⚠️ {con}
            </Typography>
          ))}
        </Stack>

        {/* Select button */}
        <Button
          fullWidth
          variant="contained"
          onClick={() => onSelect(section)}
          disabled={disabled}
          sx={{ mt: 2 }}
        >
          Select This Section
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Component 2: AgentChatInterface.tsx

**Location**: `components/scheduler/agent/AgentChatInterface.tsx`

**After** `SectionSelectionCard` is done, build this.

**What it does**:
- Displays conversation thread (agent + user messages)
- Embeds `SectionSelectionCard` components in agent messages
- Shows progress indicator
- Auto-scrolls to latest message

**Hook Integration**:
```typescript
import { useCourseSelectionOrchestrator } from '@/lib/mastra/hooks/useCourseSelectionOrchestrator';

const {
  messages,
  isProcessing,
  selectSection,
  getProgressIndicator,
} = useCourseSelectionOrchestrator(sessionInput);
```

---

## 🔧 Development Commands

### Run Tests
```bash
# All mastra tests
pnpm test lib/mastra/__tests__ --run

# Just tools
pnpm test lib/mastra/__tests__/courseSelectionTools.test.ts --run

# Just orchestrator
pnpm test lib/mastra/__tests__/courseSelectionOrchestrator.test.ts --run

# Watch mode (re-run on changes)
pnpm test lib/mastra/__tests__ --watch
```

### Storybook (If Available)
```bash
# Start Storybook
pnpm storybook

# Create story for SectionSelectionCard
# File: components/scheduler/agent/SectionSelectionCard.stories.tsx
```

### Dev Server
```bash
# Start Next.js dev server
pnpm dev

# Navigate to: http://localhost:3000/scheduler
```

---

## 🧠 Context: What This Agent Does

**Problem**: Students waste hours manually checking course sections for conflicts and preferences.

**Solution**: AI-guided course-by-course selection that:
1. Fetches all sections for a course
2. Filters out conflicting sections (overlaps with work, lunch, etc.)
3. Ranks remaining sections 0-100 by preference match
4. Shows top 5 with pros/cons
5. User picks primary + 2 backups
6. Repeats for next course
7. Saves to database

**Key Features**:
- ✅ **Conflict-free** - Only shows sections that fit your calendar
- ✅ **Preference-ranked** - Sections scored by how well they match your preferences
- ✅ **Guided backups** - Agent prompts for 2nd/3rd choices automatically
- ✅ **Live calendar** - Updates in real-time as courses are added

---

## 🎓 Architecture Decisions

### Why Hybrid Approach (Not Full Mastra)?
- ✅ **Simpler** - State machine vs complex agent framework
- ✅ **Testable** - Pure functions, easy to unit test
- ✅ **No dependencies** - Avoids Zod v3 compatibility issues
- ✅ **Maintainable** - Clear separation of concerns

### Tool Design Pattern
- **Tools are thin wrappers** around service layer functions
- **No database operations** in tool files directly
- **All business logic** in `lib/services/`
- **Proper TypeScript types** (no `any`)

### State Machine Flow
```
welcome
  ↓ (user clicks "Let's go!")
fetching_sections
  ↓
awaiting_primary
  ↓ (user selects section)
awaiting_waitlist_confirmation (if waitlisted)
  ↓
awaiting_backup_1
  ↓
awaiting_backup_2
  ↓
saving_selection
  ↓
course_complete (auto-advance to next)
  ↓
[repeat for next course]
  ↓
session_complete
```

---

## 📊 Success Metrics (When UI is Done)

### User Experience
- **Session completion rate** > 80%
- **Time to complete** < 5 min for 5 courses
- **User satisfaction** > 85%

### Technical
- **Conflict detection accuracy** > 99%
- **Top-ranked section selected** > 60% of time
- **Error rate** < 2%

### Business
- Fewer "I have scheduling conflicts" support tickets
- More students complete registration on time
- Higher satisfaction scores

---

## 🚦 Decision Points When You Return

### Decision 1: UI Framework for Chat
**Options**:
- A) Use existing MUI components (consistent with codebase)
- B) Use Radix UI primitives (more flexible)
- C) Custom build with Tailwind

**Recommendation**: Option A (MUI) - already in use, faster

### Decision 2: Message Display Pattern
**Options**:
- A) Simple chat bubbles (agent text + embedded cards)
- B) Rich interactive messages (animations, transitions)
- C) Hybrid (simple first, enhance later)

**Recommendation**: Option C (hybrid) - ship fast, improve later

### Decision 3: Real-time Updates
**Options**:
- A) Calendar updates immediately on selection
- B) Calendar updates after all courses done
- C) Manual "Update Calendar" button

**Recommendation**: Option A (immediate) - better UX, shows progress

---

## 💡 Quick Wins to Build Momentum

When you start, tackle these in order:

1. **5 min**: Create `SectionSelectionCard.tsx` file (empty component)
2. **15 min**: Add basic layout (Card with section info)
3. **10 min**: Add props/cons display with icons
4. **10 min**: Add Select button with onClick
5. **5 min**: Test with mock data

**Total: 45 min to first visual component!**

Then gradually enhance:
- Add hover states
- Add loading states
- Add animations
- Add accessibility

---

## 🆘 If Things Break

### Tests Failing?
```bash
# Check what changed
git status
git diff

# If someone else modified files, pull latest
git pull origin your-branch

# Re-run tests
pnpm test lib/mastra/__tests__ --run
```

### Import Errors?
```bash
# Reinstall dependencies
pnpm install

# Check for type errors
pnpm run build
```

### Need Help?
Check these files for examples:
- `lib/mastra/README.md` - Usage examples
- `lib/mastra/__tests__/*.test.ts` - How to use the tools
- `components/scheduler/` - Existing scheduler components for patterns

---

## 📚 Additional Resources

### Existing Components to Reference
- `components/scheduler/scheduler-calendar.tsx` - Calendar component (reuse this)
- `components/scheduler/ScheduleGenerationPanel.tsx` - Current wizard (replace this)
- `components/scheduler/event-manager.tsx` - Event handling patterns

### Types to Use
- `lib/mastra/types.ts` - All agent types
- `lib/services/scheduleService.ts` - Schedule/preference types
- `lib/database/types.ts` - Database types (auto-generated)

### Services to Call
- `lib/services/generateScheduleService.ts` - Fetch course offerings
- `lib/services/scheduleService.ts` - Save selections
- `lib/services/courseOfferingService.ts` - Course catalog queries

---

## ✅ Checklist Before You Start UI

- [ ] Read `lib/mastra/README.md`
- [ ] Run tests to verify everything works: `pnpm test lib/mastra/__tests__ --run`
- [ ] Review `IMPLEMENTATION_STATUS.md` for full context
- [ ] Create feature branch: `git checkout -b feature/agent-ui`
- [ ] Create component directory: `mkdir -p components/scheduler/agent`
- [ ] Open `SectionSelectionCard.tsx` in editor
- [ ] Reference this guide when stuck!

---

## 🎯 The Goal

Replace the current 4-step wizard with an AI-guided conversational flow that:
- Feels natural and intuitive
- Saves students time
- Prevents scheduling conflicts
- Guides them through backup selections
- Updates calendar in real-time

**You're halfway there! The hard logic is done. Now make it beautiful.** 🚀

---

**When you're ready to start**: Open `components/scheduler/agent/SectionSelectionCard.tsx` and begin building!

Good luck! 💪
