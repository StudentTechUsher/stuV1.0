# STU Loading Animation

A professional loading animation for the STU (Student Tech Usher) web application featuring the graduation cap logo with a smooth bottom-to-top fill effect using the app's primary brand color.

## Features

✅ **Smooth Fill Animation** - Logo fills from bottom to top with your `--primary` color
✅ **Responsive** - Works on all screen sizes
✅ **Dark Mode Compatible** - Looks great on both light and dark backgrounds
✅ **Customizable** - Adjust size and animation speed
✅ **Lightweight** - Pure CSS animations, no heavy dependencies
✅ **Accessible** - Professional and clean for university demos

## Components

### 1. `StuLoadingAnimation` (Primary Component)
The main loading animation with Next.js Image optimization.

```tsx
import StuLoadingAnimation from '@/components/ui/StuLoadingAnimation';

// Basic usage
<StuLoadingAnimation />

// Custom size
<StuLoadingAnimation size={120} />

// With custom class
<StuLoadingAnimation size={60} className="my-4" />
```

### 2. `StuLoadingOverlay`
Full-page loading overlay with backdrop.

```tsx
import { StuLoadingOverlay } from '@/components/ui/StuLoadingAnimation';

{isLoading && <StuLoadingOverlay />}

// Custom size, no backdrop
<StuLoadingOverlay size={120} showBackdrop={false} />
```

### 3. `StuLoadingAnimationCSS` (Alternative)
Pure CSS version without Next.js Image dependency.

```tsx
import StuLoadingAnimationCSS from '@/components/ui/StuLoadingAnimationCSS';

// Faster animation
<StuLoadingAnimationCSS size={80} speed={1.5} />
```

### 4. `StuLoadingPulse`
Pulse variation with opacity animation.

```tsx
import { StuLoadingPulse } from '@/components/ui/StuLoadingAnimationCSS';

<StuLoadingPulse size={60} />
```

## Common Use Cases

### Loading State in Cards
```tsx
<div className="flex items-center justify-center h-48">
  <StuLoadingAnimation size={60} />
</div>
```

### Inline Loading with Text
```tsx
<div className="flex items-center gap-3">
  <StuLoadingAnimation size={32} />
  <span className="text-muted-foreground">Loading graduation plan...</span>
</div>
```

### Page Loading State
```tsx
'use client';

import { useState, useEffect } from 'react';
import { StuLoadingOverlay } from '@/components/ui/StuLoadingAnimation';

export default function MyPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch data
    fetchData().then(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <StuLoadingOverlay />;
  }

  return <div>Your content</div>;
}
```

### Button Loading State
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <div className="flex items-center gap-2">
      <StuLoadingAnimation size={20} />
      <span>Creating plan...</span>
    </div>
  ) : (
    'Create Plan'
  )}
</Button>
```

## Props Reference

### StuLoadingAnimation / StuLoadingAnimationCSS

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `80` | Size of the logo in pixels |
| `className` | `string` | `''` | Additional CSS classes |
| `speed` | `number` | `2` | Animation duration in seconds (CSS version only) |

### StuLoadingOverlay

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `100` | Size of the logo in pixels |
| `showBackdrop` | `boolean` | `true` | Show semi-transparent backdrop |

## Animation Behavior

The animation creates a smooth "filling" effect:

1. **0% - 50%**: Color fills from bottom to top
2. **50% - 100%**: Color empties from bottom to top
3. **Loop**: Repeats infinitely with `ease-in-out` timing

Total duration: 2 seconds (customizable in CSS version)

## Customization

### Change Animation Speed
Edit the keyframes in the component:

```tsx
animation: stuFillUp 1.5s ease-in-out infinite; // Faster
animation: stuFillUp 3s ease-in-out infinite;   // Slower
```

### Change Fill Color
The animation uses `var(--primary)` from your CSS variables. To use a different color:

```tsx
<div style={{ backgroundColor: '#FF5722' }} /> // Replace var(--primary)
```

### Reverse Direction (Top to Bottom)
Modify the keyframe:

```css
@keyframes stuFillDown {
  0% {
    transform: translateY(-100%);
  }
  50% {
    transform: translateY(0%);
  }
  100% {
    transform: translateY(-100%);
  }
}
```

## Demo Page

Visit `/loading-demo` to see all variations and use cases in action.

## Technical Details

- **Technique**: CSS mask with translateY animation
- **Browser Support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance**: Hardware-accelerated transform animations
- **File Size**: ~2KB (component + styles)

## Troubleshooting

**Animation not showing?**
- Ensure `/public/stu_icon_black.png` exists
- Check that `--primary` is defined in your CSS variables
- Verify the component is client-side (`'use client'`)

**Logo looks distorted?**
- The PNG should have transparent background
- Ensure the logo maintains its aspect ratio

**Color not matching brand?**
- Check `app/globals.css` for the correct `--primary` value
- Light mode: `--primary: #12F987`
- Dark mode should also define `--primary`
