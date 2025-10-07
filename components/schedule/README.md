# Semester Schedule Details Table

A comprehensive semester schedule details table component that displays course information below the calendar in your Next.js app.

## Features

- ✅ Detailed course information table matching the provided screenshot
- ✅ Black header with term info, credits, difficulty, and add/drop deadline
- ✅ Green column header band
- ✅ Interactive section and instructor selection
- ✅ Hover popover with course details (description, prereqs, seats, attributes)
- ✅ Requirement badges with category colors (MAJOR, GE, REL, ELECTIVE)
- ✅ Day/time chips for schedule display
- ✅ Withdraw functionality
- ✅ Fully responsive design
- ✅ Design token-based styling (no hardcoded colors)
- ✅ Keyboard accessible
- ✅ TypeScript + Tailwind

## Components

### Main Components

- **SemesterDetailsCard** - Main wrapper component with header and table
- **CourseRowItem** - Individual course row with all interactions
- **RequirementBadges** - Colored category badges
- **DayTimeChips** - Day abbreviations and time range display

### Picker Components

- **SectionPicker** - Full modal for selecting alternative sections
- **InstructorPicker** - Popover for selecting alternative instructors
- **CoursePopover** - Hover tooltip with course details

### Common Components

- **Tooltip** - Reusable tooltip component
- **Popover** - Reusable popover component

## Usage

### Basic Example

```tsx
'use client';

import React, { useState } from 'react';
import { SemesterDetailsCard } from '@/components/schedule/SemesterDetailsCard';
import { useSemesterSchedule } from '@/lib/hooks/useSemesterSchedule';

export default function SchedulerPage() {
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);

  const {
    rows,
    scheduleDifficulty,
    sectionOptionsMap,
    instructorOptionsMap,
    changeSection,
    withdraw,
    isLoading,
  } = useSemesterSchedule('student-123', '2025-winter');

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Your calendar component would go here */}
      <div>{/* Calendar */}</div>

      {/* Semester Details Table */}
      <SemesterDetailsCard
        termLabel="Winter 2025"
        addDropDeadline="12 Sept"
        scheduleDifficulty={scheduleDifficulty}
        rows={rows}
        sectionOptionsMap={sectionOptionsMap}
        instructorOptionsMap={instructorOptionsMap}
        onChangeSection={changeSection}
        onWithdraw={withdraw}
        onRowHover={setHoveredCourseId}
      />
    </div>
  );
}
```

### Advanced: With Calendar Integration

```tsx
'use client';

import React, { useState } from 'react';
import { SemesterDetailsCard } from '@/components/schedule/SemesterDetailsCard';
import { useSemesterSchedule } from '@/lib/hooks/useSemesterSchedule';
import { CalendarView } from '@/components/calendar/CalendarView';

export default function SchedulerPage() {
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);

  const {
    rows,
    scheduleDifficulty,
    sectionOptionsMap,
    instructorOptionsMap,
    changeSection,
    withdraw,
  } = useSemesterSchedule('student-123', '2025-winter');

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Calendar - highlights hovered course */}
      <CalendarView
        courses={rows}
        highlightedCourseId={hoveredCourseId}
      />

      {/* Details Table */}
      <SemesterDetailsCard
        termLabel="Winter 2025"
        addDropDeadline="12 Sept"
        scheduleDifficulty={scheduleDifficulty}
        rows={rows}
        sectionOptionsMap={sectionOptionsMap}
        instructorOptionsMap={instructorOptionsMap}
        onChangeSection={async (courseId, sectionId) => {
          await changeSection(courseId, sectionId);
          // Calendar will automatically update via rows state change
        }}
        onWithdraw={async (courseId) => {
          await withdraw(courseId);
          // Calendar will automatically update via rows state change
        }}
        onRowHover={setHoveredCourseId}
      />
    </div>
  );
}
```

## API Integration

Replace the mock data in `useSemesterSchedule` with actual API calls:

### GET Schedule

```typescript
// lib/hooks/useSemesterSchedule.ts

const response = await fetch(
  `/api/semester-schedule?studentId=${studentId}&term=${term}`
);
const data = await response.json();
```

Expected response:

```json
{
  "courses": [
    {
      "id": "course-1",
      "code": "FIN 413",
      "title": "Real Estate Finance and Investment",
      "section": "002",
      "difficulty": 3.1,
      "instructorId": "inst-1",
      "instructorName": "Jarom Jackson",
      "instructorRating": 4.2,
      "meeting": {
        "days": ["M", "W"],
        "start": "09:00",
        "end": "09:45"
      },
      "location": {
        "building": "232 TNRB",
        "room": "232"
      },
      "credits": 3.0,
      "requirementTags": [
        { "type": "MAJOR", "weight": 5.6 }
      ]
    }
  ]
}
```

### POST Change Section

```typescript
const response = await fetch('/api/semester-schedule/change-section', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ courseId, newSectionId }),
});
```

### POST Withdraw

```typescript
const response = await fetch('/api/semester-schedule/withdraw', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ courseId }),
});
```

## Design Tokens

The components use CSS custom properties from `globals.css`:

### Required Tokens

```css
:root {
  /* Colors */
  --primary: ...;
  --foreground: ...;
  --muted: ...;
  --muted-foreground: ...;
  --card: ...;
  --card-foreground: ...;
  --popover: ...;
  --popover-foreground: ...;
  --border: ...;
  --ring: ...;

  /* Category Colors */
  --major: ...;
  --minor: ...;
  --ge: ...;
  --rel: ...;
  --elective: ...;

  /* Shadows */
  --shadow-lg: ...;
}
```

### Fallback Colors

If category colors are not defined, add them to your `globals.css`:

```css
:root {
  --major: #3b82f6;     /* Blue */
  --minor: #8b5cf6;     /* Purple */
  --ge: #10b981;        /* Green */
  --rel: #f59e0b;       /* Amber */
  --elective: #6b7280;  /* Gray */
}
```

## Accessibility

- ✅ Semantic HTML table structure
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus visible states
- ✅ Screen reader friendly
- ✅ Color contrast compliant

## Performance

- Mock data simulates network delays for realistic UX
- Optimistic updates for section changes
- Virtualization ready for large course lists (>20 courses)
- Minimal re-renders with React memoization

## Testing

Run tests for credit calculations:

```bash
npm test -- creditMath.test.ts
```

## Customization

### Hide Columns on Mobile

Update `CourseRowItem.tsx` to add responsive classes:

```tsx
<td className="px-4 py-4 hidden md:table-cell">
  {/* Difficulty column - hidden on mobile */}
</td>
```

### Add More Filters to Section Picker

Extend `SectionPicker.tsx`:

```tsx
const [filterDay, setFilterDay] = useState<DayOfWeek | null>(null);
const [filterTime, setFilterTime] = useState<'morning' | 'afternoon' | null>(null);
```

### Custom Requirement Badge Colors

Update `RequirementBadges.tsx` configuration:

```tsx
const requirementConfig = {
  MAJOR: { label: 'MAJOR', colorClass: 'bg-blue-600 text-white' },
  // ... add more
};
```

## File Structure

```
components/schedule/
├── SemesterDetailsCard.tsx       # Main container
├── CourseRowItem.tsx             # Row component
├── RequirementBadges.tsx         # Category badges
├── DayTimeChips.tsx              # Schedule chips
├── CoursePopover.tsx             # Hover details
├── SectionPicker.tsx             # Section modal
├── InstructorPicker.tsx          # Instructor popover
└── README.md                     # This file

components/common/
├── Tooltip.tsx                   # Reusable tooltip
└── Popover.tsx                   # Reusable popover

lib/hooks/
└── useSemesterSchedule.ts        # Data hook

lib/mocks/
└── semesterSchedule.ts           # Mock data

lib/utils/
├── creditMath.ts                 # Calculations
└── __tests__/
    └── creditMath.test.ts        # Unit tests

types/
└── schedule.ts                   # TypeScript types
```

## Support

For issues or questions, refer to the component code or create an issue in your project repository.
