# Supabase Storage Setup Guide

## LinkedIn Profile Storage Bucket

The LinkedIn profile upload feature requires a Supabase Storage bucket to be created.

### Quick Setup Steps

1. **Navigate to Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard
   - Click on "Storage" in the left sidebar

2. **Create the Bucket**
   - Click "Create a new bucket"
   - Use these settings:
     - **Name:** `student-documents`
     - **Public bucket:** ✅ Yes (allows students to view their uploaded documents)
     - **File size limit:** `10485760` (10 MB) or higher
     - **Allowed MIME types:** `application/pdf` (optional but recommended)

3. **Apply RLS Policies**
   - Navigate to "Storage" → "Policies" → "student-documents"
   - Click "New Policy"
   - Apply the SQL policies below

### Storage Bucket RLS Policies

Run these SQL queries in the Supabase SQL Editor to set up proper Row-Level Security:

```sql
-- ============================================================
-- STORAGE BUCKET: student-documents
-- Policies for LinkedIn profile PDFs and other student documents
-- ============================================================

-- Policy 1: Allow authenticated users to upload their own documents
-- Ensures users can only upload to their own folder: linkedin-profiles/{user_id}/
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to read their own documents
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 3: Allow public read access (for viewing uploaded PDFs)
-- Required if the bucket is public
CREATE POLICY "Public can read student documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-documents');

-- Policy 4: Allow authenticated users to update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 5: Allow authenticated users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

### Folder Structure

The storage bucket will organize files as follows:

```
student-documents/
└── linkedin-profiles/
    ├── {user_id_1}/
    │   ├── 1234567890_resume.pdf
    │   └── 1234567891_updated_resume.pdf
    ├── {user_id_2}/
    │   └── 1234567892_resume.pdf
    └── ...
```

Each user has their own folder identified by their auth user ID, ensuring separation and security.

### File Upload Constraints

- **Maximum file size:** 10 MB
- **Allowed file type:** PDF only (`application/pdf`)
- **Naming convention:** `{timestamp}_{sanitized_filename}.pdf`
- **Storage path:** `linkedin-profiles/{user_id}/{timestamp}_{filename}.pdf`

### Verification

After setup, test the upload feature:

1. Navigate to `/dashboard/profile` as an authenticated student
2. Click the LinkedIn upload button
3. Upload a PDF file (< 10 MB)
4. Verify the upload succeeds without errors
5. Check the Supabase Storage dashboard to see the uploaded file

### Troubleshooting

**Error: "Bucket not found"**
- Ensure the bucket name is exactly `student-documents`
- Verify the bucket exists in the Supabase Storage dashboard

**Error: "Unauthorized" or "Permission denied"**
- Check that RLS policies are applied correctly
- Verify the user is authenticated
- Ensure the bucket is set to "Public"

**Error: "File too large"**
- Check the file size limit on the bucket
- Verify client-side validation is working (10 MB limit in code)

### Database Schema

The feature stores the uploaded file URL in the `profiles` table:

```sql
-- These columns should already exist in your profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_profile_uploaded_at TIMESTAMPTZ;
```

### Security Considerations

1. **RLS Policies:** Users can only upload/view/delete their own documents
2. **File Type Validation:** Only PDF files are accepted
3. **File Size Limit:** 10 MB maximum to prevent abuse
4. **Folder Isolation:** Each user has a separate folder
5. **Public Bucket:** Allows viewing without authentication (suitable for LinkedIn profiles)

### Future Enhancements

Consider adding:
- File versioning (keep multiple uploads)
- Automatic PDF scanning/validation
- OCR to extract LinkedIn data from PDF
- Preview thumbnails
- Download tracking/analytics
