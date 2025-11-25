# LinkedIn Profile Feature

## Overview
This feature allows students to upload their LinkedIn profile as a PDF for analysis and recordkeeping within the Stu platform.

## Database Schema Changes

### Profiles Table
Add the following columns to the `profiles` table:

```sql
-- Add LinkedIn profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN linkedin_profile_url TEXT,
ADD COLUMN linkedin_profile_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.linkedin_profile_url IS 'URL to the uploaded LinkedIn profile PDF in Supabase Storage';
COMMENT ON COLUMN profiles.linkedin_profile_uploaded_at IS 'Timestamp when the LinkedIn profile was last uploaded';
```

### Supabase Storage Setup

1. **Create Storage Bucket** (if not exists):
   - Bucket name: `student-documents`
   - Public access: Yes (for profile viewing)
   - File size limit: 10MB

2. **Storage Policies**:

```sql
-- Allow authenticated users to upload their own LinkedIn profiles
CREATE POLICY "Users can upload their own LinkedIn profiles"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = 'linkedin-profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own LinkedIn profiles
CREATE POLICY "Users can read their own LinkedIn profiles"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = 'linkedin-profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to update their own LinkedIn profiles
CREATE POLICY "Users can update their own LinkedIn profiles"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = 'linkedin-profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to delete their own LinkedIn profiles
CREATE POLICY "Users can delete their own LinkedIn profiles"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = 'linkedin-profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

## Feature Components

### 1. LinkedInShareButton Component
**Location**: `/components/profile/LinkedInShareButton.tsx`

**Features**:
- Modern, minimal button design matching Stu design system
- Opens LinkedIn profile in new tab
- Shows modal with step-by-step export instructions
- Drag-and-drop file upload interface
- Real-time upload status with loading states
- Success state with link to view uploaded profile
- Error handling with user-friendly messages

**Props**:
```typescript
interface LinkedInShareButtonProps {
  studentId: string;
  onUploadSuccess?: (fileUrl: string) => void;
  existingProfileUrl?: string | null;
}
```

### 2. API Endpoint
**Location**: `/app/api/profile/linkedin-upload/route.ts`

**Features**:
- Authenticated user validation
- PDF file type validation
- 10MB file size limit
- Secure file upload to Supabase Storage
- Profile table update with file URL and timestamp
- Error handling and logging

**Request**:
- Method: POST
- Content-Type: multipart/form-data
- Body: { file: File, studentId: string }

**Response**:
```json
{
  "success": true,
  "fileUrl": "https://...",
  "message": "LinkedIn profile uploaded successfully"
}
```

### 3. Profile Page Integration
**Location**: `/app/dashboard/profile/page.tsx`

**Features**:
- Clean section showing LinkedIn profile status
- Visual indicator for uploaded vs. not uploaded state
- Integrated LinkedIn share button
- Matches design system of other dashboard components

## User Flow

1. **User clicks "Share LinkedIn Profile" button**
   - LinkedIn profile page opens in new tab
   - Modal appears with export instructions

2. **User exports LinkedIn profile as PDF**
   - Click "More" on LinkedIn profile
   - Select "Save to PDF"
   - PDF downloads to device

3. **User uploads PDF to Stu**
   - Drag-drop or click to select downloaded PDF
   - File is validated (type, size)
   - Upload progress shown with loading state

4. **Upload completes**
   - Success message displayed
   - Profile record updated in database
   - User can view or re-upload profile

## Design Decisions

### Visual Design
- **Black header (#0A0A0A)**: Matches academic-summary and other dashboard cards
- **Green primary color**: Consistent with Stu brand (var(--primary))
- **Rounded corners**: 2xl for cards, lg for buttons (modern, friendly)
- **Subtle shadows**: Depth without heaviness
- **Clear typography**: font-header-bold for titles, font-body for content

### UX Decisions
- **Auto-open LinkedIn**: Reduces friction, guides user immediately
- **Step-by-step instructions**: Numbered list makes export process clear
- **Drag-drop + click**: Flexible upload options for all users
- **Real-time feedback**: Loading states, success/error messages
- **Persistent state**: Shows current upload status on profile page

### Technical Decisions
- **Supabase Storage**: Secure, scalable, integrated with existing auth
- **File validation**: Client + server-side for security
- **Unique filenames**: Prevents collisions with timestamps
- **Public URLs**: Allows easy viewing and sharing
- **RLS policies**: Users can only access their own files

## Testing Checklist

- [ ] Button appears on /dashboard/profile page
- [ ] Clicking button opens LinkedIn in new tab
- [ ] Modal displays with correct instructions
- [ ] File upload validates PDF type
- [ ] File upload validates 10MB limit
- [ ] Drag-drop functionality works
- [ ] Click-to-select functionality works
- [ ] Upload progress shows loading state
- [ ] Success state shows uploaded file info
- [ ] Error state shows helpful error message
- [ ] Profile table updates with file URL
- [ ] Uploaded status reflects on profile page
- [ ] Can re-upload and update profile
- [ ] Storage policies prevent unauthorized access

## Future Enhancements

1. **LinkedIn API Integration**: Auto-import profile data via API
2. **Profile Analysis**: AI-powered insights from LinkedIn data
3. **Career Matching**: Match profile to career opportunities
4. **Profile Completeness Score**: Gamify profile optimization
5. **Batch Upload**: Upload multiple documents at once
6. **Version History**: Track profile changes over time

## Security Considerations

- All uploads require authentication
- RLS policies enforce user-level access control
- File type validation prevents malicious uploads
- File size limits prevent storage abuse
- Storage paths include user ID to prevent conflicts
- Public URLs are unpredictable (long random paths)

## Accessibility

- Clear, descriptive button labels
- Keyboard navigation support
- Screen reader-friendly instructions
- High contrast colors for readability
- Focus states on interactive elements
- Error messages are clear and actionable
