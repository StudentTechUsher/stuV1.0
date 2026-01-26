# PostHog Session Recording Setup

## Overview

PostHog session recording is **enabled for all sessions in production** with smart PII masking to maintain FERPA compliance.

## How It Works

### What Gets Recorded
- ✅ **UI labels and text** - Button text, headings, navigation items
- ✅ **User interactions** - Clicks, page navigation, scrolling
- ✅ **Page structure** - Layout, components, visual hierarchy
- ✅ **Flow patterns** - How users navigate through the application

### What Gets Masked
- 🔒 **All input fields** - Text inputs, textareas, selects (automatically masked)
- 🔒 **Student PII** - Names, emails, student IDs, phone numbers
- 🔒 **Academic records** - Grades, GPA, transcript data
- 🔒 **Emails in text** - Any text matching email pattern

## CSS Classes for PII Masking

When building components that display student data, use these CSS classes to ensure FERPA compliance:

### Required Classes

```tsx
// Student Information
<div className="student-name">John Doe</div>          // ❌ Masked
<div className="student-email">john@example.com</div> // ❌ Masked
<div className="student-id">A12345678</div>           // ❌ Masked
<div className="student-phone">(555) 123-4567</div>   // ❌ Masked

// Academic Records
<div className="course-grade">A-</div>                // ❌ Masked
<div className="gpa-value">3.75</div>                 // ❌ Masked
<div className="transcript-data">...</div>            // ❌ Masked

// Generic PII (use when above classes don't fit)
<div className="pii-data">Sensitive info</div>        // ❌ Masked
<div data-ph-mask>Sensitive info</div>                // ❌ Masked
```

### Safe UI Elements (No Masking Needed)

```tsx
// These are SAFE and will be visible in recordings
<h1>Academic History</h1>                    // ✅ Visible
<button>Save Progress</button>               // ✅ Visible
<label>Select your major:</label>            // ✅ Visible
<div>Course: CS 142</div>                    // ✅ Visible (course codes are safe)
```

## Real-World Examples

### ❌ WRONG - Exposes Student Name
```tsx
function StudentProfile({ student }) {
  return (
    <div>
      <h2>{student.name}</h2>  {/* This will be visible in recordings! */}
      <p>GPA: {student.gpa}</p>
    </div>
  );
}
```

### ✅ CORRECT - Properly Masked
```tsx
function StudentProfile({ student }) {
  return (
    <div>
      <h2 className="student-name">{student.name}</h2>  {/* Masked */}
      <p>GPA: <span className="gpa-value">{student.gpa}</span></p>  {/* Masked */}
    </div>
  );
}
```

### ✅ CORRECT - Table with Mixed Data
```tsx
function TranscriptTable({ courses }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Course Code</th>  {/* Safe - visible */}
          <th>Course Name</th>  {/* Safe - visible */}
          <th>Grade</th>        {/* Header visible */}
        </tr>
      </thead>
      <tbody>
        {courses.map(course => (
          <tr key={course.id}>
            <td>{course.code}</td>           {/* Safe - "CS 142" is visible */}
            <td>{course.name}</td>           {/* Safe - "Intro to CS" is visible */}
            <td className="course-grade">    {/* Masked - grade is PII */}
              {course.grade}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## What is Considered PII?

According to FERPA, you must mask:

### ✅ Always Mask (PII)
- Student names (first, last, full)
- Email addresses
- Student ID numbers
- Phone numbers
- Grades (letter grades, percentages, pass/fail)
- GPA values
- Social Security Numbers
- Date of birth
- Address information
- Any combination that could identify a specific student

### ❌ Safe to Show (Not PII)
- Course codes (e.g., "CS 142", "ENGL 316")
- Course names (e.g., "Introduction to Programming")
- Semester names (e.g., "Fall 2024")
- University names
- Department names
- Degree program names (e.g., "Computer Science BS")
- General requirement categories
- UI labels and instructions

## Testing Your Changes

### 1. Local Testing
```bash
# Start your dev server
pnpm dev

# Navigate to your component
# Open browser DevTools → Network tab
# Look for requests to PostHog (us.i.posthog.com)
# Verify recordings are being captured
```

### 2. Check PostHog Dashboard
1. Go to https://us.i.posthog.com
2. Navigate to "Session Recordings"
3. Filter by recent recordings
4. Play a recording and verify:
   - UI text is visible
   - Student names/emails are masked with asterisks
   - Grades and GPA values are masked

### 3. Verify Masking
Look for elements that appear as:
```
████████    (masked text)
***@***.*** (masked email)
[masked]    (masked input field)
```

## Configuration Reference

The session recording config is in `contexts/posthog-provider.tsx`:

```typescript
session_recording: {
  maskAllInputs: true,           // All <input>, <textarea>, <select>
  maskTextSelector: '...',       // CSS selector for PII elements
  recordCrossOriginIframes: false,
  maskTextFn: (text) => { ... }, // Custom email masking
}
```

## Target Flows

Session recording is particularly important for these flows:
1. **User Onboarding** - New user registration and profile setup
2. **Course Planning** - Graduation plan creation and course selection
3. **Academic History** - `/academic-history` page interactions

## Troubleshooting

### Recordings not appearing?
1. Check that `NEXT_PUBLIC_POSTHOG_KEY` is set in `.env`
2. Verify PostHog initialized: Check browser console for "PostHog initialized successfully"
3. Check Network tab for requests to `us.i.posthog.com`

### Too much is masked?
- Review your CSS classes - you may have accidentally added masking classes to UI elements
- Check for overly broad selectors in `maskTextSelector`

### Student data visible in recordings?
- **CRITICAL**: Add appropriate masking classes immediately
- Review the PII checklist above
- Test the specific component in PostHog dashboard

## Best Practices

1. **Default to masking** - When in doubt, add a masking class
2. **Review during code review** - Specifically check for PII exposure
3. **Test in PostHog** - Always verify recordings after implementing student data displays
4. **Document edge cases** - If you find PII that doesn't fit the categories, update this document

## Questions?

If you're unsure whether something is PII or how to properly mask it, ask the team or refer to:
- [FERPA Guidelines](https://studentprivacy.ed.gov/faq/what-education-record)
- This project's `CLAUDE.md` file for coding standards
