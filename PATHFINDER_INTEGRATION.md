# Pathfinder Career Info - Integration Guide

## Overview
This guide shows how to integrate the Career Info system into your existing Pathfinder page.

## Quick Start

### 1. Import Required Components and Hooks

```tsx
import { useState } from 'react';
import { useCareerSearch } from '@/lib/hooks/useCareers';
import CareerCard from '@/components/pathfinder/CareerCard';
import CareerInfoModal from '@/components/pathfinder/CareerInfoModal';
import type { Career } from '@/types/career';
```

### 2. Add State and Hooks to Your Pathfinder Page

```tsx
export default function PathfinderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCareer, setActiveCareer] = useState<Career | null>(null);
  const [isAdvisor, setIsAdvisor] = useState(false); // Set based on user role

  const { data: careers, isLoading } = useCareerSearch(searchTerm);

  const handleSelectRelated = (slug: string) => {
    const related = careers.find((c) => c.slug === slug);
    if (related) {
      setActiveCareer(related);
    }
  };

  // ... rest of your component
}
```

### 3. Render Career Cards in Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {careers?.map((career) => (
    <CareerCard
      key={career.id}
      career={career}
      onClick={() => setActiveCareer(career)}
    />
  ))}
</div>
```

### 4. Add Career Info Modal

```tsx
{activeCareer && (
  <CareerInfoModal
    open={!!activeCareer}
    career={activeCareer}
    onClose={() => setActiveCareer(null)}
    onSelectRelated={handleSelectRelated}
    isAdvisor={isAdvisor}
  />
)}
```

## Full Example

```tsx
'use client';

import React, { useState } from 'react';
import { useCareerSearch } from '@/lib/hooks/useCareers';
import CareerCard from '@/components/pathfinder/CareerCard';
import CareerInfoModal from '@/components/pathfinder/CareerInfoModal';
import type { Career } from '@/types/career';

export default function PathfinderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCareer, setActiveCareer] = useState<Career | null>(null);

  // TODO: Replace with actual user role check
  const isAdvisor = true; // For PoC, set to true for advisors

  const { data: careers, isLoading, error } = useCareerSearch(searchTerm);

  const handleSelectRelated = (slug: string) => {
    const related = careers.find((c) => c.slug === slug);
    if (related) {
      setActiveCareer(related);
    }
  };

  return (
    <main className="p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-header text-[var(--foreground)]">
          Pathfinder
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Explore careers and find your path
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search careers, skills, majors..."
          className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-[var(--muted-foreground)]">Loading careers...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-[var(--destructive)]">
            Failed to load careers. Please try again.
          </p>
        </div>
      )}

      {/* Career Grid */}
      {!isLoading && !error && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {careers.length} career{careers.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {careers.map((career) => (
              <CareerCard
                key={career.id}
                career={career}
                onClick={() => setActiveCareer(career)}
              />
            ))}
          </div>

          {careers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[var(--muted-foreground)]">
                No careers found. Try a different search term.
              </p>
            </div>
          )}
        </>
      )}

      {/* Career Info Modal */}
      {activeCareer && (
        <CareerInfoModal
          open={!!activeCareer}
          career={activeCareer}
          onClose={() => setActiveCareer(null)}
          onSelectRelated={handleSelectRelated}
          isAdvisor={isAdvisor}
        />
      )}
    </main>
  );
}
```

## Advisor/Admin Features

### Enable Edit Mode

For advisors/admins, set `isAdvisor={true}` on the CareerInfoModal component. This will:

1. Show "Manage All" and "Edit" buttons in the modal header
2. "Manage All" navigates to `/pathfinder/careers/manage` - a table view of all careers
3. "Edit" navigates to `/pathfinder/careers/edit/[slug]` for the current career
4. The edit page allows full CRUD operations

### Management Dashboard

Advisors can navigate directly to `/pathfinder/careers/manage` to:

- View all careers in a table format
- See status (Published/Draft), outlook, salary, and last updated date
- Quick search/filter careers
- Click "Edit" to edit any career
- Click "Publish" to publish draft careers
- View summary stats (total, published, drafts)

**Direct URL:** `https://yourapp.com/pathfinder/careers/manage`

### Role Checking (TODO)

Replace the hardcoded `isAdvisor` check with your actual authentication/authorization:

```tsx
import { useUser } from '@/lib/hooks/useUser'; // Your auth hook

export default function PathfinderPage() {
  const { user } = useUser();
  const isAdvisor = user?.role === 'ADVISOR' || user?.role === 'ADMIN' || user?.role === 'STU';

  // ... rest of component
}
```

## Adding New Careers

Advisors can add new careers by:

1. Navigating to `/pathfinder/careers/edit/new-career-slug`
2. Filling out the CareerEditForm
3. Saving as draft or publishing

Or programmatically:

```tsx
import { saveCareerDraft } from '@/lib/hooks/useCareers';

const newCareer: Career = {
  id: `car_${Date.now()}`,
  slug: 'my-new-career',
  title: 'My New Career',
  // ... other fields
  status: 'DRAFT',
  lastUpdatedISO: new Date().toISOString(),
};

await saveCareerDraft(newCareer);
```

## Future Enhancements (TODOs)

The following integration points are marked for future development:

### External Data Sources

**BLS/O*NET Integration** (`lib/mocks/careers.seed.ts:7-9`)
- Replace salary data with live BLS API
- Fetch job outlook from O*NET database
- Auto-update growth projections

**LinkedIn/Handbook Integration** (`lib/mocks/careers.seed.ts:8`)
- Pull skills from LinkedIn Skills Graph
- Import sample job titles from industry handbooks
- Sync with real job postings

**Institutional Mapping** (`lib/mocks/careers.seed.ts:9`)
- Map careers to institutional program codes
- Link to actual course catalog entries
- Connect to degree audit systems

### Search Enhancements

Replace basic string search with:
- Full-text search (Algolia, Elasticsearch)
- Fuzzy matching
- Skill-based recommendations
- Major compatibility scoring

### Analytics

Add tracking for:
- Most viewed careers
- Student engagement metrics
- Career-to-major conversion rates
- Search patterns

## File Structure

```
types/
  career.ts                                   # TypeScript types

lib/
  mocks/
    careers.seed.ts                           # Mock data + CRUD functions
  hooks/
    useCareers.ts                             # Data fetching hooks

components/
  pathfinder/
    CareerCard.tsx                            # Grid/list card
    CareerInfoModal.tsx                       # Detail modal/drawer
    CareerSkillChips.tsx                      # Skill tags display
    InfoRow.tsx                               # Label/value row helper
    CareerEditForm.tsx                        # Admin edit form

app/
  api/
    careers/
      route.ts                                # GET /api/careers
      [slug]/route.ts                         # GET /api/careers/[slug]
      save-draft/route.ts                     # POST /api/careers/save-draft
      publish/route.ts                        # POST /api/careers/publish
  pathfinder/
    careers/
      edit/
        [slug]/
          page.tsx                            # Edit page
```

## Accessibility Features

All components include:
- Keyboard navigation (Tab, Esc)
- Focus trapping in modal
- ARIA labels and roles
- Screen reader friendly
- Focus rings on interactive elements

## Responsive Design

- **Desktop**: Modal centered with max-width
- **Mobile**: Bottom sheet drawer behavior
- **Tablet**: Optimized grid layouts

## Styling

All components use design tokens from `globals.css`:
- `--primary`, `--foreground`, `--muted`, `--ring`
- `--card`, `--border`, `--accent`
- No hardcoded hex values

## Testing the Integration

1. Start dev server: `npm run dev`
2. Navigate to `/pathfinder`
3. Click any career card to open modal
4. Test search functionality
5. As advisor, click "Edit" to test admin features
6. Try related career navigation
7. Test mobile responsiveness

## Support

For issues or questions:
- Check component props in TypeScript definitions
- Review API routes for data structure
- See seed data for examples
