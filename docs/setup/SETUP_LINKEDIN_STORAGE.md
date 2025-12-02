# LinkedIn Profile Upload - Complete Setup Guide

## Current Error

You're seeing this error because the Supabase Storage bucket `student-documents` doesn't exist yet:

```
Error [StorageApiError]: Bucket not found
status: 400,
statusCode: '404'
```

## Quick Fix (3 Steps)

### Step 1: Create Storage Bucket in Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **Storage** in the left sidebar
3. Click **"New bucket"** or **"Create a new bucket"**
4. Enter these settings:
   - **Name:** `student-documents` (must be exactly this)
   - **Public bucket:** ✅ **YES** (check this box)
   - **File size limit:** `10485760` bytes (10 MB)
   - **Allowed MIME types:** Leave empty or add `application/pdf`
5. Click **"Create bucket"**

### Step 2: Apply Storage Security Policies

1. In Supabase Dashboard, go to **Storage** → **Policies**
2. Select the `student-documents` bucket
3. Click **"New Policy"** and choose **"Create a policy from scratch"**
4. Run this SQL in the Supabase **SQL Editor**:

```sql
-- Allow users to upload their own LinkedIn PDFs
CREATE POLICY "Users can upload their own LinkedIn profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "Users can read their own LinkedIn profiles"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public read access (required for public bucket)
CREATE POLICY "Public can read LinkedIn profiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own LinkedIn profiles"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'linkedin-profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

### Step 3: Run Database Migration (if not already done)

The database columns should already exist, but verify by running this in Supabase SQL Editor:

```sql
-- Check if columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('linkedin_profile_url', 'linkedin_profile_uploaded_at');
```

If the columns don't exist, run the migration:

```sql
-- Add LinkedIn profile columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add documentation
COMMENT ON COLUMN profiles.linkedin_profile_url IS 'URL to the uploaded LinkedIn profile PDF in Supabase Storage';
COMMENT ON COLUMN profiles.linkedin_profile_uploaded_at IS 'Timestamp when the LinkedIn profile was uploaded';
```

## Verification

After completing all steps:

1. **Refresh your application** (hard refresh: Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Navigate to **`/dashboard/profile`**
3. Click the **LinkedIn upload button**
4. Try uploading a PDF file (less than 10 MB)
5. You should see: **"LinkedIn profile uploaded successfully"**

## How It Works

```
User uploads PDF → API validates file → Stores in Supabase Storage → URL saved to profiles table
                                           ↓
                      Path: student-documents/linkedin-profiles/{user_id}/{timestamp}_{filename}.pdf
```

## File Constraints

- **Max size:** 10 MB
- **File type:** PDF only (`.pdf`)
- **Storage path:** `linkedin-profiles/{user_id}/timestamp_filename.pdf`
- **Access:** Public (anyone with the URL can view)

## Security Features

✅ Users can only upload to their own folder (enforced by RLS)
✅ File type validation (PDF only)
✅ File size limit (10 MB max)
✅ Unique filenames prevent overwrites
✅ Separate folders per user

## Troubleshooting

### Still seeing "Bucket not found"?
- Double-check bucket name is exactly: `student-documents` (no typos, no spaces)
- Verify bucket exists in Supabase Dashboard → Storage
- Try refreshing the page or clearing browser cache

### "Permission denied" error?
- Ensure RLS policies are applied correctly
- Verify user is logged in
- Check bucket is marked as "Public"

### "File too large" error?
- Verify file is under 10 MB
- Check bucket file size limit setting

### Upload succeeds but URL doesn't save?
- Check database columns exist (run Step 3 verification query)
- Look in browser console for errors
- Check Supabase logs for database errors

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- Migration file: `docs/migrations/add_linkedin_profile_fields.sql`
- API route: `app/api/profile/linkedin-upload/route.ts`
- Upload component: `components/profile/LinkedInShareButton.tsx`

## Need Help?

If you continue experiencing issues:

1. Check Supabase Dashboard → Logs for detailed error messages
2. Check browser console (F12) for client-side errors
3. Verify environment variables are set correctly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
