# Expandable Progress Panel - Usage Guide

## Quick Start

The Advisor Progress Overview Panel now supports **two modes**:

1. **Simple Mode** (default) - Compact progress bars
2. **Expandable Mode** - Detailed requirement breakdowns with course tracking

---

## Mode 1: Simple Progress Bars (Default)

Use this for a compact overview without detailed breakdowns.

```tsx
import { AdvisorProgressPanel, calculateCategoryProgress } from '@/components/grad-planner/AdvisorProgressPanel';

<AdvisorProgressPanel
  studentName="Sarah Johnson"
  totalCredits={{ earned: 118.16, required: 133.66 }}
  categories={categoryProgress}
  currentSemesterCredits={12}
  plannedCredits={118.16}
/>
```

**Result:** Shows compact progress bars for each category (Major, GE, Religion, Electives).

---

## Mode 2: Expandable Detailed View

Use this for detailed requirement and course-level tracking.

### Step 1: Import Mock Data (or create your own)

```tsx
import { AdvisorProgressPanel } from '@/components/grad-planner/AdvisorProgressPanel';
import mockExpandableCategories from '@/components/grad-planner/mockExpandableData';
```

### Step 2: Enable Expandable View

```tsx
<AdvisorProgressPanel
  studentName="Sarah Johnson"
  totalCredits={{ earned: 118.16, required: 133.66 }}
  categories={categoryProgress}  // Still needed for fallback
  useExpandableView={true}        // Enable expandable mode
  expandableCategories={mockExpandableCategories}  // Provide detailed data
  currentSemesterCredits={12}
  plannedCredits={118.16}
/>
```

**Result:** Each category becomes clickable and expands to show:
- Individual requirements with progress
- Course-level details with status badges
- Nested expand/collapse for each requirement

---

## Creating Your Own Expandable Data

### Example: General Education Category

```typescript
import type { ExpandableCategoryData } from '@/components/grad-planner/ExpandableProgressCategory';

const myGECategory: ExpandableCategoryData = {
  name: 'General Education',
  totalCredits: 39,
  percentComplete: 0.81,
  color: '#2196f3',              // Blue
  completed: 31.5,
  inProgress: 3,
  planned: 0,
  remaining: 4.5,
  requirements: [
    {
      id: 'ge-1',
      title: 'American Heritage',
      description: 'Complete 1 of 7 options',
      progress: 1,
      total: 1,
      status: 'completed',
      courses: [
        {
          id: 'amher-201',
          code: 'AMHER 201',
          title: 'American Heritage',
          credits: 3,
          status: 'completed',
          term: 'Fall 2023',
        },
      ],
    },
    {
      id: 'ge-2',
      title: 'Global and Cultural Awareness',
      description: 'Complete 1 of 6 options',
      progress: 1,
      total: 1,
      status: 'completed',
      courses: [
        {
          id: 'glob-210',
          code: 'GLOB 210',
          title: 'Global Studies',
          credits: 3,
          status: 'completed',
          term: 'Winter 2024',
        },
      ],
    },
    // ... more requirements
  ],
};
```

---

## Visual Hierarchy

### Category Card (Collapsed)
```
┌─────────────────────────────────────────────┐
│ 🟦 General Education                    ▼   │
│                                             │
│ 39 required credit hours • 81% complete    │
│ ████████████████░░░░░░░ 81%                │
│                                             │
│ ✓ 31.5 Completed  ⟳ 3 In Progress          │
└─────────────────────────────────────────────┘
```

### Category Card (Expanded)
```
┌─────────────────────────────────────────────┐
│ 🟦 General Education                    ▲   │
│                                             │
│ 39 required credit hours • 81% complete    │
│ ████████████████░░░░░░░ 81%                │
│                                             │
│ ✓ 31.5 Completed  ⟳ 3 In Progress          │
└─────────────────────────────────────────────┘

  ┌───────────────────────────────────────┐
  │ ① American Heritage                   │
  │   Complete 1 of 7 options        1/1  │
  │   ████████████████████ 100%           │
  │                                   ▼   │
  └───────────────────────────────────────┘

    ┌─────────────────────────────────┐
    │ ✓ AMHER 201                     │
    │   American Heritage             │
    │   3 cr • Fall 2023              │
    └─────────────────────────────────┘

  ┌───────────────────────────────────────┐
  │ ② Global and Cultural Awareness       │
  │   Complete 1 of 6 options        1/1  │
  │   ████████████████████ 100%           │
  └───────────────────────────────────────┘
```

---

## Status Icons Reference

| Icon | Status | Color | Meaning |
|------|--------|-------|---------|
| ✓ | Completed | Green | Course finished |
| ⟳ | In Progress | Yellow | Currently taking |
| ◌ | Planned | Gray | Scheduled for future |
| − | Remaining | Light Gray | Not yet scheduled |

---

## Integration Example (Full)

```tsx
'use client';

import React from 'react';
import {
  AdvisorProgressPanel,
  calculateCategoryProgress
} from '@/components/grad-planner/AdvisorProgressPanel';
import mockExpandableCategories from '@/components/grad-planner/mockExpandableData';

export default function ApprovalPage() {
  const [useExpandableView, setUseExpandableView] = React.useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = React.useState(false);

  // ... your data fetching logic

  return (
    <div className="grid grid-cols-[1fr_380px] gap-4">
      {/* Main content */}
      <div>{/* Your grad plan editor */}</div>

      {/* Progress panel with toggle */}
      <div>
        <button onClick={() => setUseExpandableView(!useExpandableView)}>
          {useExpandableView ? 'Show Simple View' : 'Show Detailed View'}
        </button>

        <AdvisorProgressPanel
          studentName="Sarah Johnson"
          totalCredits={{ earned: 118.16, required: 133.66 }}
          categories={categoryProgress}
          useExpandableView={useExpandableView}
          expandableCategories={mockExpandableCategories}
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          currentSemesterCredits={12}
          plannedCredits={118.16}
        />
      </div>
    </div>
  );
}
```

---

## Accessibility Features

✅ **Keyboard Navigation:** All expand/collapse buttons are keyboard accessible
✅ **Screen Readers:** Proper ARIA labels and roles
✅ **Progress Bars:** `role="progressbar"` with aria-valuenow/min/max
✅ **Focus States:** Visible outline on interactive elements
✅ **Semantic HTML:** Proper button elements for all interactions

---

## Performance Tips

1. **Lazy Load Details:** Start in simple mode, let advisors opt-in to detailed view
2. **Virtualization:** For very long requirement lists, consider virtualizing
3. **Memoization:** Wrap expensive calculations in `React.useMemo()`
4. **Debounce Expand:** Add slight delay to prevent accidental double-clicks

---

## Common Use Cases

### Use Case 1: Quick Progress Check
**Mode:** Simple
**When:** Advisor just wants to see overall completion %

### Use Case 2: Detailed Review
**Mode:** Expandable
**When:** Advisor needs to verify specific courses and requirements

### Use Case 3: Approval Process
**Mode:** Expandable
**When:** Advisor is reviewing before final approval

---

## Color Reference

Match these colors for consistency with Semester Scheduler:

```typescript
const categoryColors = {
  'Major': 'var(--primary)',  // #12F987 (green)
  'GE': '#2196f3',            // Blue
  'Religion': '#5E35B1',      // Indigo
  'Electives': '#9C27B0',     // Magenta
};
```

---

## Next Steps

1. Replace mock data with real data from your database
2. Add click handlers for course details (open modal/sidebar)
3. Implement filtering (show only incomplete requirements)
4. Add export functionality (generate PDF report)
5. Track advisor interactions (analytics on what they expand)
