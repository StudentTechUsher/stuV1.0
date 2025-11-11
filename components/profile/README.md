# LinkedIn Share Profile Button

A modern, minimal component for allowing students to upload their LinkedIn profile PDF to Stu.

## Quick Start

```tsx
import LinkedInShareButton from '@/components/profile/LinkedInShareButton';

// In your component
<LinkedInShareButton
  studentId={user.id}
  onUploadSuccess={(fileUrl) => {
    console.log('Profile uploaded:', fileUrl);
  }}
  existingProfileUrl={user.linkedInProfileUrl}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `studentId` | `string` | Yes | The authenticated user's ID |
| `onUploadSuccess` | `(fileUrl: string) => void` | No | Callback fired when upload completes |
| `existingProfileUrl` | `string \| null` | No | URL of previously uploaded profile (if any) |

## Features

- ✅ Opens LinkedIn profile in new tab automatically
- ✅ Modal with step-by-step export instructions
- ✅ Drag-and-drop file upload
- ✅ Click-to-select file upload
- ✅ Real-time upload progress
- ✅ File validation (PDF only, 10MB max)
- ✅ Success/error states with user feedback
- ✅ Fully responsive design
- ✅ Matches Stu design system

## User Flow

1. User clicks "Share LinkedIn Profile" button
2. LinkedIn profile opens in new tab (https://www.linkedin.com/in/me/)
3. Modal displays with 4-step instructions
4. User exports PDF from LinkedIn ("More" → "Save to PDF")
5. User uploads PDF via drag-drop or file selection
6. Upload progress shown with loading state
7. Success message displayed with link to view profile

## Design System

This component follows the Stu design system:

### Colors
- Black header: `#0A0A0A`
- Primary green: `var(--primary)`
- Text colors: `var(--foreground)`, `var(--muted-foreground)`
- Borders: `var(--border)`

### Typography
- Headers: `font-header-bold`
- Body: `font-body`
- Semi-bold: `font-body-semi`

### Components
- Card border radius: `rounded-2xl`
- Button border radius: `rounded-lg`
- Shadows: `shadow-sm` → `shadow-md` on hover
- Transitions: `transition-all duration-200`

## API Endpoint

The component calls `/api/profile/linkedin-upload` which:

1. Validates user authentication
2. Validates file type (PDF only)
3. Validates file size (10MB max)
4. Uploads to Supabase Storage (`student-documents/linkedin-profiles/{userId}/`)
5. Updates profile table with file URL and timestamp
6. Returns success/error response

## Storage Structure

```
student-documents/
  └── linkedin-profiles/
      └── {user_id}/
          └── {timestamp}_{filename}.pdf
```

Example:
```
student-documents/linkedin-profiles/abc123/1704067200000_JohnDoe-LinkedIn.pdf
```

## Error Handling

The component handles:
- Invalid file types (non-PDF)
- Files exceeding 10MB
- Network errors during upload
- Server errors
- Authentication failures

All errors display user-friendly messages with retry options.

## Accessibility

- Keyboard navigation supported
- Screen reader friendly
- High contrast colors
- Clear focus states
- Descriptive ARIA labels
- Semantic HTML structure

## Security

- Requires authentication
- Server-side validation
- RLS policies enforce user-level access
- Files stored with user ID in path
- No XSS vulnerabilities
- Safe error messages (no sensitive data)

## Database Schema

Requires these columns in `profiles` table:

```sql
linkedin_profile_url TEXT
linkedin_profile_uploaded_at TIMESTAMP WITH TIME ZONE
```

Run the migration: `/docs/migrations/add_linkedin_profile_fields.sql`

## Testing

```typescript
// Test successful upload
const mockUser = { id: 'test-user-id' };
const mockFile = new File(['test'], 'linkedin.pdf', { type: 'application/pdf' });

// Test file validation
const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
// Should show error: "Please upload a PDF file"

// Test file size
const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf');
// Should show error: "File size must be less than 10MB"
```

## Dependencies

- `lucide-react` - Icons
- `@/components/ui/StuLoader` - Loading spinner
- `/api/profile/linkedin-upload` - Upload endpoint
- Supabase Storage - File storage
- Tailwind CSS - Styling

## Example Implementation

See `/app/dashboard/profile/page.tsx` for a complete working example.

## Support

For issues or questions, see:
- `/docs/LINKEDIN_PROFILE_FEATURE.md` - Full documentation
- `/docs/LINKEDIN_IMPLEMENTATION_SUMMARY.md` - Implementation guide
