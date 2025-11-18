# Archived Graduation Plan Implementations

This directory contains archived versions of the graduation plan feature as it evolved through different iterations.

## Version History

### v1-original (Nov 2024)
**Location:** Originally at `/grad-plan`

**Description:**
The original graduation plan list view. This was a simple page that displayed all graduation plans for a user with basic filtering and viewing capabilities.

**Key Features:**
- List view of all user's graduation plans
- Basic plan information display
- Links to view/edit individual plans via `[accessId]` route

**Why Replaced:**
- Limited functionality
- No guided plan creation flow
- Difficult for students to create plans from scratch

---

### v2-iteration (Nov 2024)
**Location:** Originally at `/grad-plan2`

**Description:**
An experimental iteration exploring different UI patterns for graduation plan management.

**Key Features:**
- Enhanced list view with better filtering
- Improved plan cards
- Client-side state management with `grad-plan2-client.tsx`

**Why Replaced:**
- Still lacked guided creation flow
- Didn't solve the core user experience issues
- Led to development of v3 with chatbot-guided creation

---

### Current Production (v3 - Chatbot System)
**Location:** `/grad-plan`

**Description:**
The current production system featuring an AI-powered chatbot that guides students through creating their graduation plan.

**Key Features:**
- Conversational chatbot interface for plan creation
- Step-by-step guided flow collecting:
  - Profile information (graduation date, career goals, etc.)
  - Transcript courses
  - Program selection (majors/minors)
  - Course selection for requirements
- AI-powered plan generation using existing `OrganizeCoursesIntoSemesters_ServerAction`
- Career and program pathfinder tools
- Progress tracking with visual steps
- Sticky header with progress bar
- Real-time validation and error handling

**Migration Date:** November 17, 2024

---

## File Structure

```
_archived-grad-plan/
├── README.md (this file)
├── v1-original/
│   └── page.tsx
└── v2-iteration/
    ├── grad-plan2-client.tsx
    └── page.tsx
```

## Restoration

If you need to restore an older version:

1. Copy files from the appropriate version folder
2. Move to `/grad-plan` directory
3. Update any route references in navigation
4. Test thoroughly before deploying

## Notes

- The `[accessId]` route was preserved through all versions and remains in production
- All versions used the same underlying database schema and services
- The evolution was primarily focused on improving the user experience for plan creation
