# Advisor Progress Overview Panel

A comprehensive progress tracking component for advisors to view student graduation progress at a glance.

## Overview

The `AdvisorProgressPanel` component provides advisors with:

- **Overall graduation progress** (credits earned vs required)
- **Category breakdown** by Major, General Education, Religion, and Electives
- **Visual progress bars** with layered fill for different completion states
- **Detailed credit tracking** with status pills
- **Collapsible design** to maximize screen real estate when needed
- **Fully responsive** and accessible UI

## Design System Integration

This component follows the existing Stu design system:

### Colors

- Uses the same color system as `semester-results-table.tsx` for consistency:
  - **Major**: `var(--primary)` (#12F987 - mint green)
  - **GE**: `#2196f3` (blue)
  - **Religion**: `#5E35B1` (indigo)
  - **Electives**: `#9C27B0` (magenta/purple)

### Typography

- Header font: Red Hat Display (700 weight)
- Labels: Small caps with wide tracking (0.26em - 0.3em)
- Follows the same font hierarchy as `PlanHeader` and `PlanSummary`

### Styling Patterns

- **Border radius**: `rounded-[7px]` (consistent with other grad plan components)
- **Shadows**: Soft, layered shadows matching `PlanHeader` style
- **Color mixing**: Uses CSS `color-mix()` for semantic tinting
- **Spacing**: 6-unit base padding, 3-4 unit gaps between elements

## Component API

### Props

```typescript
interface AdvisorProgressPanelProps {
  // Student information
  studentName: string;

  // Overall credit tracking
  totalCredits: {
    earned: number;
    required: number;
  };

  // Category-level breakdown
  categories: CategoryProgress[];

  // Optional: plan data for additional analysis
  planData?: Term[];

  // Collapse state
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;

  // Optional: Additional credit metrics
  currentSemesterCredits?: number; // Credits student is currently taking
  plannedCredits?: number;         // Total credits planned in the grad plan
}

interface CategoryProgress {
  category: string;           // e.g., "Major", "GE", "Religion", "Electives"
  completed: number;          // Credits completed
  inProgress: number;         // Credits currently being taken
  planned: number;            // Credits scheduled but not started
  remaining: number;          // Credits still needed
  total: number;              // Total credits required for this category
  color: string;              // CSS color value
}
```

### Helper Functions

#### `calculateCategoryProgress(planData: Term[]): CategoryProgress[]`

Automatically calculates category progress from a plan's term data.

**How it works:**
- Analyzes each course's `fulfills` array to categorize it
- Sums credits by category
- Returns formatted `CategoryProgress` objects

**Categorization logic:**
- Checks `fulfills` array for keywords:
  - **Major** (green): Contains "major"
  - **GE** (blue): Contains "gen ed", "global & cultural", or "american heritage"
  - **Religion** (indigo): Contains "religion" or "rel "
  - **Electives** (magenta): Default for anything else

**Example:**

```typescript
const categories = calculateCategoryProgress(editablePlan);
// Returns: [
//   { category: "Major", completed: 58, inProgress: 3, ... },
//   { category: "GE", completed: 34, inProgress: 0, ... },
//   ...
// ]
```

## Usage Examples

### Basic Usage

```tsx
import { AdvisorProgressPanel } from '@/components/grad-planner/AdvisorProgressPanel';

function ApprovalPage() {
  const categories = [
    {
      category: "Major",
      completed: 58,
      inProgress: 3,
      planned: 0,
      remaining: 3,
      total: 64,
      color: "var(--primary)"
    },
    // ... other categories
  ];

  return (
    <AdvisorProgressPanel
      studentName="Sarah Johnson"
      totalCredits={{ earned: 118.16, required: 133.66 }}
      categories={categories}
    />
  );
}
```

### With Auto-Calculation (Full Example)

```tsx
import {
  AdvisorProgressPanel,
  calculateCategoryProgress
} from '@/components/grad-planner/AdvisorProgressPanel';

function ApprovalPage() {
  const planData = editablePlan; // Term[] from your grad plan

  const categories = React.useMemo(() => {
    return calculateCategoryProgress(planData);
  }, [planData]);

  const totalCredits = React.useMemo(() => {
    const earned = planData.reduce((total, term) => {
      return total + (term.credits_planned || 0);
    }, 0);
    return { earned, required: 133.66 };
  }, [planData]);

  // Calculate current semester (first term)
  const currentSemesterCredits = React.useMemo(() => {
    if (!planData || planData.length === 0) return 0;
    const currentTerm = planData[0];
    return currentTerm.credits_planned || 0;
  }, [planData]);

  // Calculate total planned credits
  const plannedCredits = React.useMemo(() => {
    return planData.reduce((total, term) => {
      return total + (term.credits_planned || 0);
    }, 0);
  }, [planData]);

  return (
    <AdvisorProgressPanel
      studentName="Sarah Johnson"
      totalCredits={totalCredits}
      categories={categories}
      planData={planData}
      currentSemesterCredits={currentSemesterCredits}
      plannedCredits={plannedCredits}
    />
  );
}
```

### With Collapse Toggle

```tsx
function ApprovalPage() {
  const [isPanelCollapsed, setIsPanelCollapsed] = React.useState(false);

  return (
    <AdvisorProgressPanel
      studentName="Sarah Johnson"
      totalCredits={{ earned: 118.16, required: 133.66 }}
      categories={categories}
      isCollapsed={isPanelCollapsed}
      onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
    />
  );
}
```

### In a Grid Layout (Production Example)

```tsx
function ApprovalPage() {
  const [isPanelCollapsed, setIsPanelCollapsed] = React.useState(false);

  return (
    <div className="grid grid-cols-[1fr_380px] gap-4">
      {/* Main content */}
      <div className="rounded-[7px] border bg-white p-6">
        <GraduationPlanner {...props} />
      </div>

      {/* Progress panel */}
      <AdvisorProgressPanel
        studentName={studentName}
        totalCredits={totalCreditsData}
        categories={categoryProgress}
        planData={editablePlan}
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />
    </div>
  );
}
```

## Visual States

### Progress Bar Segments

The category progress bars use layered fills to show different states:

1. **Completed** (solid fill)
   - Uses category color at full opacity
   - Represents courses that have been finished

2. **In Progress** (striped fill)
   - Uses category color with diagonal stripe pattern
   - Represents courses currently being taken

3. **Planned** (light fill)
   - Uses category color at 35% opacity
   - Represents courses scheduled for future terms

4. **Remaining** (not shown in bar)
   - Calculated as: `total - (completed + inProgress + planned)`
   - Displayed in status pills if > 0

### Status Pills

Small pill indicators show credit counts by status:

- ✓ **Completed** (green border/bg)
- ⟳ **In Progress** (yellow border/bg)
- ◌ **Planned** (gray border/bg)
- − **Remaining** (light gray border/bg)

### Collapsed State

When collapsed:
- Panel width reduces to ~60px
- Shows only the overall percentage
- All category details hidden
- Collapse toggle button remains visible

## Accessibility

The component follows accessibility best practices:

### ARIA Attributes

- Progress bars use `role="progressbar"` with proper `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Descriptive `aria-label` for each progress bar segment
- Panel has `aria-label="Student Progress Overview"`
- Collapse button has descriptive `aria-label` based on state

### Keyboard Navigation

- Collapse toggle is keyboard accessible
- Focus states use visible outlines
- All interactive elements support keyboard activation

### Screen Readers

- Progress percentages are announced clearly
- Category names and credit values are properly associated
- Legend provides context for visual indicators

## Responsive Behavior

### Desktop (lg+)
- Full width panel (380px)
- All details visible
- Sticky positioning (`sticky top-6`)

### Mobile (< lg)
- Panel hidden by default
- Should be shown below main content if needed
- Full width on small screens

**Current implementation:**
```tsx
<Box sx={{ display: { xs: 'none', lg: 'block' } }}>
  <AdvisorProgressPanel {...props} />
</Box>
```

## Integration Points

### Current Integration

The component is integrated into the advisor approval page:

**File:** `app/dashboard/approve-grad-plans/[accessId]/page.tsx`

**Layout:**
```tsx
<Box sx={{
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    lg: isPanelCollapsed ? '1fr auto' : '1fr 380px'
  },
  gap: 4
}}>
  {/* Graduation Planner */}
  <Box>...</Box>

  {/* Progress Panel */}
  <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
    <AdvisorProgressPanel ... />
  </Box>
</Box>
```

### Data Sources

The panel currently pulls data from:

1. **Plan data**: `editablePlan` state (array of Terms)
2. **Student info**: From `gradPlan.student_first_name` and `student_last_name`
3. **Categories**: Auto-calculated via `calculateCategoryProgress(editablePlan)`
4. **Total credits**: Computed from sum of all term credits

### Future Enhancements

Potential improvements for future versions:

1. **Dynamic required credits**
   - Pull from program requirements instead of hardcoded 133.66
   - Different totals per category based on degree program

2. **Real completion tracking**
   - Integrate with transcript data to mark courses as truly completed
   - Distinguish between planned and actually enrolled courses

3. **GPA tracking**
   - Add average GPA per category
   - Show cumulative GPA in header

4. **Milestone indicators**
   - Flag if student is on track for on-time graduation
   - Warning indicators for at-risk categories

5. **Drill-down interaction**
   - Click category to see course list
   - Expand/collapse individual category details

## Examples

See `AdvisorProgressPanel.example.tsx` for comprehensive usage examples including:

- Completed plan (ready to graduate)
- In-progress plan (mid-degree)
- Early-stage plan (freshman)
- Collapsed state demonstration
- Grid layout integration

## Expandable Detailed View

The panel now supports an **expandable detailed view** that shows requirement-level breakdowns with individual course tracking.

### Enabling Expandable View

```tsx
import { AdvisorProgressPanel } from '@/components/grad-planner/AdvisorProgressPanel';
import mockExpandableCategories from '@/components/grad-planner/mockExpandableData';

<AdvisorProgressPanel
  studentName="Sarah Johnson"
  totalCredits={{ earned: 118.16, required: 133.66 }}
  categories={categoryProgress}
  useExpandableView={true}
  expandableCategories={mockExpandableCategories}
/>
```

### Expandable Features

**Category Level:**
- Click any category to expand/collapse
- Shows requirement count and completion summary
- Full-width progress bar with gradient
- Quick stats badges (Completed, In Progress, Planned, Remaining)

**Requirement Level:**
- Numbered circles (1-8) for each requirement
- Progress bar per requirement
- Expand/collapse individual requirements to view courses
- Visual progress indicators

**Course Level:**
- Status badges (✓ Completed, ⟳ In Progress, ◌ Planned, − Remaining)
- Course code, title, and credits
- Optional term and instructor info
- Hover states and tooltips

### Data Structure

```typescript
interface ExpandableCategoryData {
  name: string;                    // e.g., "Major", "GE"
  totalCredits: number;           // Total credits required
  percentComplete: number;        // 0.0 - 1.0
  color: string;                  // Category color
  completed: number;              // Credits completed
  inProgress: number;             // Credits in progress
  planned: number;                // Credits planned
  remaining: number;              // Credits remaining
  requirements: Requirement[];    // List of requirements
}

interface Requirement {
  id: string | number;
  title: string;
  description: string;
  progress: number;               // Current progress
  total: number;                  // Total required
  status: 'completed' | 'in-progress' | 'remaining';
  courses: CourseDetail[];
}

interface CourseDetail {
  id: string;
  code: string;                   // e.g., "CS 101"
  title: string;                  // e.g., "Intro to Programming"
  credits: number;
  status: 'completed' | 'in-progress' | 'planned' | 'remaining';
  term?: string;                  // e.g., "Fall 2023"
  instructor?: string;
}
```

## Files

- **Component**: `components/grad-planner/AdvisorProgressPanel.tsx`
- **Expandable View**: `components/grad-planner/ExpandableProgressCategory.tsx`
- **Mock Data**: `components/grad-planner/mockExpandableData.ts`
- **Documentation**: `components/grad-planner/AdvisorProgressPanel.md` (this file)
- **Integration**: `app/dashboard/approve-grad-plans/[accessId]/page.tsx`

## Dependencies

- React 18+
- TypeScript
- Tailwind CSS
- lucide-react (icons: ChevronRight, ChevronLeft)
- `@/lib/utils` (cn helper)
- `./types` (Term, Course interfaces)

## Notes

- Component uses CSS variables from `globals.css`
- Follows the service layer pattern (no direct DB access)
- All state managed by parent component
- Pure presentation component with helper functions
- Mobile-first responsive design
- WCAG 2.1 AA compliant
