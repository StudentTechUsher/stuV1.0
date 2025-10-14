# Program Requirements Authoring System

## Overview

The new Program Requirements Authoring System provides a visual, user-friendly interface for advisors to create and manage program requirements without needing to write JSON manually.

## Features

### 1. **Visual Requirement Builder**
- **Drag-and-drop interface** for organizing requirements
- **6 requirement types** to choose from:
  - ✓ **Complete All**: Students must complete all courses
  - \# **Choose N**: Students choose N courses from a list
  - ∑ **Credit Threshold**: Students earn minimum credits
  - ⇄ **Track Selection**: Students pick one track/concentration
  - → **Sequence**: Courses in specific order (by term/cohort)
  - ℹ **Information Only**: Steps or notes without courses

### 2. **Course Management**
- Add courses with:
  - Course code (e.g., "ACC 200")
  - Course title
  - Credits (supports variable credits with min/max)
  - Prerequisites
  - Terms offered (Fall, Spring, Summer)
- Expandable advanced options for each course
- Duplicate, edit, or delete courses easily

### 3. **Constraint System**
Set rules and constraints for each requirement:
- **Admissions Gates**: Must complete before program admission
- **Grade Requirements**: Minimum grade per course or GPA for group
- **No Double Counting**: Prevent courses from counting toward multiple requirements
- **Track Exclusive**: Enforce single track selection
- **Group Caps** (coming soon): Limit courses from certain levels
- **Course Caps** (coming soon): Limit how many times a course can count

### 4. **Three View Modes**

#### Author Mode
- Visual card-based interface
- Add, edit, duplicate, or delete requirements
- Collapsible cards for easy organization
- Real-time validation

#### Student Preview Mode
- See exactly how students will view requirements
- Interactive progress tracking
- Check/uncheck courses to test progress
- Visual progress bars and completion indicators
- Displays constraints, prerequisites, and notes

#### JSON Mode
- Advanced users can edit raw JSON
- Sync changes between visual editor and JSON
- Validates JSON on save
- Useful for bulk operations or precise edits

### 5. **Progress Tracking (Student View)**
When students view requirements:
- Overall progress bar
- Individual requirement progress
- Color-coded status:
  - ✓ Green: Completed
  - ⚠ Yellow: In progress
  - ○ Gray: Not started
  - 🔒 Lock icon: Admissions gate
- "What's left" hints
- Prerequisite warnings
- Credit tracking for credit bucket requirements

## How to Use

### Creating a New Program

1. Click **"Add Program"** in the Maintain Programs page
2. Fill in basic information:
   - Program Name (e.g., "Accounting")
   - Program Type (major, minor, emphasis, general_education)
   - Version (optional)
3. Click **"Add Requirement"** in the Requirements section
4. Choose a requirement type
5. Add courses or steps
6. Set constraints if needed
7. Click **"Save Changes"**

### Example: Creating an Accounting Major

Here's how to create the Accounting major requirements shown in the initial example:

#### Requirement 1: Prerequisites
1. Add Requirement → **Complete All**
2. Description: "Complete 3 Courses"
3. Add Notes: "Prerequisite courses: A minimum of a B grade..."
4. Add Courses:
   - ACC 200 - Principles of Accounting - 3 credits
   - ACC 310 - Principles of Accounting 2 - 3 credits (Prereq: ACC 200)
   - IS 201 - Intro to Information Systems - 3 credits
5. Set Constraints:
   - ✓ Admissions Gate
   - Minimum Grade: B

#### Requirement 2: Foundation Courses
1. Add Requirement → **Complete All**
2. Description: "Complete 6 Courses"
3. Add 6 courses (ACC 241, ECON 110, FIN 201, etc.)

#### Requirement 3: Junior Core
1. Add Requirement → **Complete All**
2. Description: "Complete 11 Courses (Junior Core)"
3. Add 11 courses including variable credit courses
   - For variable credit (e.g., 1.5 credits):
     - Expand "Advanced Options"
     - Check "Variable credit course"
     - Set Min: 1.5, Max: 1.5

#### Requirement 4: Advisement Steps
1. Add Requirement → **Information Only**
2. Description: "Advisement Confirmation"
3. Add Steps:
   - Step 1: "Obtain confirmation from your advisement center..."
   - Step 2: "Complete Marriott School exit survey online."

### Testing Your Requirements

1. After adding requirements, click **"Student Preview"** tab
2. Check courses to simulate completion
3. Verify progress bars and completion logic
4. Ensure constraints work as expected
5. Check that notes and warnings display correctly

### Advanced: JSON Editing

1. Click **"JSON"** tab to see the raw structure
2. Edit JSON directly if needed
3. Click **"Apply Changes"** to update the visual editor
4. Use **"Sync from Author View"** to update JSON from visual changes

## Architecture

### File Structure

```
types/
  programRequirements.ts         # Type definitions

components/maintain-programs/
  requirements-author.tsx         # Main authoring component
  requirement-card.tsx            # Individual requirement editor
  course-form.tsx                 # Course entry form
  constraints-editor.tsx          # Constraint configuration
  student-requirements-view.tsx  # Student preview mode
  edit-requirements-dialog.tsx   # Updated dialog (integration)
```

### Type System

The system uses a comprehensive type system:
- `ProgramRequirement`: Union of all requirement types
- `Course`: Course definition with metadata
- `RequirementConstraints`: Rules and limits
- `RequirementProgress`: Student progress tracking
- `ValidationResult`: Validation errors and warnings

### Data Flow

```
User Input → RequirementsAuthor → ProgramRequirementsStructure → JSON → Database
                                                                         ↓
Student View ← Progress Tracking ← Course Completion Data ← Database
```

## Benefits

### For Advisors
- ✓ No JSON knowledge required
- ✓ Visual, intuitive interface
- ✓ Immediate preview of student experience
- ✓ Validation prevents errors
- ✓ Duplicate and modify existing requirements easily

### For Students
- ✓ Clear, organized requirement display
- ✓ Real-time progress tracking
- ✓ Visual indicators and progress bars
- ✓ Helpful notes and prerequisites shown inline
- ✓ "What's left" hints

### For Developers
- ✓ Type-safe implementation
- ✓ Extensible architecture
- ✓ Separation of concerns
- ✓ Reusable components
- ✓ JSON schema for data portability

## Future Enhancements

### Planned Features
- [ ] Track/Option Group builder UI
- [ ] Sequence builder with term scheduling
- [ ] Group caps and course caps UI
- [ ] Bulk import from CSV
- [ ] Copy requirements from another program
- [ ] Template library (common requirement patterns)
- [ ] Prerequisite validation and dependency graph
- [ ] Credit hour calculator
- [ ] Export to PDF for advising sheets

### Potential Integrations
- Course catalog integration
- Transcript parser integration
- Degree audit system
- Registration system
- Academic planning tools

## Troubleshooting

### Requirements not saving
- Check that program name and type are filled in
- Verify all required constraint fields are set (e.g., N for "Choose N")
- Check browser console for errors

### JSON validation errors
- Click "Sync from Author View" to regenerate clean JSON
- Use Author mode instead of JSON mode for most edits
- Ensure all courses have required fields (code, title, credits)

### Student preview not updating
- This is a demo mode - changes are local only
- Real student data will come from transcript system
- Progress is calculated client-side for preview

## Support

For questions or issues with the requirements authoring system:
1. Check this documentation
2. Review the example (Accounting major)
3. Use Student Preview to test your requirements
4. Contact the development team if issues persist

---

**Version**: 1.0
**Last Updated**: 2025-10-13
**Compatible with**: stuV1.0