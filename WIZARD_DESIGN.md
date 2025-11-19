# Graduation Plan Wizard - Design Refactor

## Overview

The graduation plan onboarding wizard has been redesigned to match Figma's minimal, elegant design language. The refactor focuses on **UX clarity**, **generous whitespace**, **single-question focus**, and **responsive card-based layouts** — all while maintaining the existing logic and functionality.

## Key Design Principles Applied

### 1. **Minimal, Centered Layout**
- **WizardContainer**: Changed from a left-aligned header layout to a **vertically centered** design
- Content is centered on all screen sizes with a maximum width constraint (max-w-2xl)
- All questions and inputs fit on a single screen without scrolling (except CourseSelectionForm)
- Clean, distraction-free experience

### 2. **Thin Progress Bar**
- **WizardProgressBar**: Reduced from `h-1` (4px) to `h-px` (1px) for a subtle, Figma-like appearance
- Removed percentage text; kept only step indicator below the bar
- Still shows smooth animated fill on progress

### 3. **Compact, Refined Option Tiles**
- **OptionTile**: Reduced padding from `p-4 md:p-6` to `px-4 py-3 md:px-5 md:py-4`
- Checkmark indicator reduced to `w-5 h-5` (was `w-6 h-6`)
- Subtle hover shadow (`hover:shadow-sm`) instead of border changes
- Smoother transitions with `duration-150` instead of `200`

### 4. **Clean Typography & Spacing**
- **WizardFormLayout**: Reduced spacing from `space-y-8` to `space-y-6`
- Button layout centered on mobile, right-aligned on desktop
- Subtle, refined text hierarchy with proper line-height and tracking

### 5. **Minimal Navigation Buttons**
- "Back" and "Continue" buttons are now smaller, compact, and clean
- Removed arrow symbols (← →) for a modern, minimal feel
- Primary button uses indigo-600 with clear hover state
- Subtle outline style for secondary "Back" button

### 6. **Input Fields**
- Clean border with proper focus state using `focus:ring-indigo-500`
- Proper placeholder contrast with `placeholder-gray-500`
- Smooth transitions for interactive states

## Component Changes

### WizardContainer.tsx
```
Before: Left-aligned header, thick 4px progress bar, large spacing
After:  Vertically centered content, 1px progress bar, generous whitespace
```
- Changed from `max-w-2xl mx-auto px-6 py-12` to centered flex layout with full viewport centering
- Header reduced to close button and minimal progress indicator
- Main content uses `flex items-center justify-center` for vertical centering

### WizardProgressBar.tsx
```
Before: h-1 (4px), percentage text, step text side-by-side
After:  h-px (1px), only step indicator below
```
- Reduced visual weight from 4px to 1px
- Single-line indicator showing current step
- Same smooth transition animation

### WizardFormLayout.tsx
```
Before: space-y-8 spacing, large title hierarchy
After:  space-y-6 spacing, flexible button layout
```
- More compact spacing between sections
- Button layout uses `flex gap-3 justify-center md:justify-end`
- Optional title/subtitle (delegated to WizardContainer)

### OptionTile.tsx
```
Before: p-4 md:p-6, w-6 h-6 checkmark, border-2
After:  px-4 py-3 md:px-5 md:py-4, w-5 h-5 checkmark, border
```
- Reduced padding for compact appearance
- Smaller checkmark (14px icon instead of 16px)
- Subtler border styling
- Soft hover shadow instead of aggressive border changes

### NameScreen.tsx (Example Step)
```
Before: Large buttons with arrow symbols
After:  Compact buttons with minimal labels
```
- Button padding reduced to `px-4 md:px-5 py-2`
- Removed arrow symbols
- Text labels simplified to "Back" and "Continue"

## Visual Hierarchy

### Typography
- **Main Question** (WizardContainer h1): `text-2xl md:text-3xl font-semibold`
- **Subtitle** (WizardContainer p): `text-sm md:text-base text-gray-600`
- **Option Titles** (OptionTile): `font-medium text-base`
- **Option Descriptions**: `text-xs md:text-sm text-gray-600`

### Colors
- **Primary**: `indigo-600` (buttons, focus states)
- **Background**: `white` (clean, minimal)
- **Borders**: `gray-200` → `gray-300` on hover
- **Text**: `gray-900` (primary), `gray-600` (secondary), `gray-500` (tertiary)

### Spacing
- Container padding: `px-4 md:px-6`
- Question area margin: `mb-8` (centered section)
- Form/content margin: `mb-8`
- Button gap: `gap-2 md:gap-3`

## Responsive Design

### Mobile (< 768px)
- Centered single-column layout with side padding
- Smaller text sizes (`text-sm` for subtitles)
- Compact button spacing (`gap-2`)
- Center-aligned buttons

### Desktop (≥ 768px)
- Same centered max-width constraint
- Larger text sizes (`text-base` for subtitles)
- Normal button spacing (`gap-3`)
- Right-aligned buttons for footer

## Browser Support & Accessibility

✅ Clean focus states with `focus:ring-2 focus:ring-inset focus:ring-indigo-500`
✅ Proper semantic HTML (`button type="button"`)
✅ High contrast text on backgrounds
✅ No motion except smooth transitions
✅ Screen reader friendly labels and structure

## Future Enhancements

1. **Dark Mode Support**: Extend color variables for dark theme
2. **Animation**: Optional subtle entrance animations for form fields
3. **Form Validation**: Real-time validation with error states
4. **Multi-language**: Ensure text scalability for different languages

## Files Modified

1. **WizardContainer.tsx** - Main layout refactor to centered design
2. **WizardProgressBar.tsx** - Minimal 1px progress bar
3. **WizardFormLayout.tsx** - Compact spacing and button layout
4. **OptionTile.tsx** - Smaller padding, subtler interactions
5. **NameScreen.tsx** - Example of button and input styling

## Notes

- All logic remains unchanged; this is a **styling-only refactor**
- Component interfaces are preserved for backward compatibility
- Tailwind CSS variables are used consistently with the design system
- The CourseSelectionForm step is excluded from the single-screen requirement due to its complexity

---

**Design Language**: Figma-inspired minimalism
**Tailwind Version**: Compatible with Tailwind v3+
**Status**: Production-ready, fully tested ✓
