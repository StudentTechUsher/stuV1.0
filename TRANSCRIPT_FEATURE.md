# Transcript Upload Feature - Testing Guide

## Overview

This feature allows students to upload transcript PDFs, which are parsed by n8n and saved to their profile. Parsed courses can be reviewed/edited before saving.

---

## Setup

### 1. Run the Supabase Migration

```bash
# If using Supabase CLI locally
supabase migration up

# OR manually apply the migration
# Copy contents of supabase/migrations/20250130_transcript_upload.sql
# and run in Supabase SQL Editor
```

This creates:
- `documents` table (tracks uploaded transcripts)
- `user_courses` table (stores parsed course data)
- `transcripts` storage bucket
- RLS policies for security

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and set:

```bash
# REQUIRED
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Get from Supabase Dashboard → Settings → API

# OPTIONAL (for n8n integration)
# TRANSCRIPT_PARSING_WEBHOOK_URL=https://your-n8n.com/webhook/parse-transcript
# TRANSCRIPT_WEBHOOK_SECRET=your-secret  # Generate with: openssl rand -hex 32
```

---

## Testing Locally (Without n8n)

### 1. Start the dev server

```bash
npm run dev
```

### 2. Test Upload Flow

1. Navigate to `/dashboard/profile` or create a new account
2. Find the "Upload Transcript" card
3. Drag/drop or click to upload a PDF (max 10MB)
4. Verify:
   - File uploads successfully
   - Status shows "Uploaded" (or "Parsing" if webhook is configured)
   - Document appears in Supabase `documents` table

### 3. Test Parsed Courses (Manual)

Without n8n, you'll need to manually trigger the `/api/events` endpoint to simulate parsing:

```bash
# Get the documentId from the upload response or Supabase dashboard

curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-stu-signature: your-secret" \
  -d '{
    "type": "user.transcript.parsed",
    "userId": "your-user-uuid",
    "documentId": "your-document-uuid",
    "courses": [
      {
        "term": "Fall 2024",
        "subject": "CS",
        "number": "142",
        "title": "Introduction to Programming",
        "credits": 3,
        "grade": "A",
        "confidence": 0.95
      },
      {
        "term": "Fall 2024",
        "subject": "MATH",
        "number": "221",
        "title": "Calculus I",
        "credits": 4,
        "grade": "B+",
        "confidence": 0.88
      }
    ]
  }'
```

### 4. Verify Parsed Courses Table

1. After triggering the webhook, refresh the page
2. The "Parsed Courses" table should appear
3. Verify:
   - All courses are displayed correctly
   - Low confidence scores (<70%) are highlighted in yellow
   - Inline editing works (change term, subject, etc.)
   - Delete button removes courses from the list
   - "Save All" button persists changes

### 5. Check Database

```sql
-- View all documents for a user
SELECT * FROM public.documents WHERE user_id = 'your-user-uuid';

-- View all courses for a user
SELECT * FROM public.user_courses WHERE user_id = 'your-user-uuid' ORDER BY term DESC;

-- Check storage bucket
SELECT * FROM storage.objects WHERE bucket_id = 'transcripts';
```

---

## Testing with n8n (Production)

### 1. Set up n8n Workflow

Your n8n workflow should:
1. Receive webhook POST from STU with `{ documentId, userId, storagePath }`
2. Download PDF from Supabase Storage using `storagePath`
3. Parse PDF (using AI, OCR, or custom logic)
4. POST results back to `https://your-stu-instance.com/api/events` with:
   ```json
   {
     "type": "user.transcript.parsed",
     "userId": "...",
     "documentId": "...",
     "courses": [...]
   }
   ```
   Include header: `x-stu-signature: <TRANSCRIPT_WEBHOOK_SECRET>`

### 2. Configure Webhook URLs

Update `.env.local`:

```bash
TRANSCRIPT_PARSING_WEBHOOK_URL=https://your-n8n.com/webhook/parse-transcript
TRANSCRIPT_WEBHOOK_SECRET=your-secret
```

### 3. End-to-End Test

1. Upload a transcript PDF
2. Verify status changes: `uploaded` → `parsing` → `parsed`
3. Parsed courses table should auto-populate when parsing completes

---

## File Structure

```
app/
├── api/
│   ├── uploads/transcript/route.ts    # Handles PDF upload
│   ├── events/route.ts                # Webhook receiver from n8n
│   └── profile/courses/bulk-upsert/route.ts  # Saves edited courses
components/
└── transcript/
    ├── TranscriptUpload.tsx           # Upload UI with drag/drop
    ├── ParsedCoursesTable.tsx         # Editable table of parsed courses
    ├── TranscriptUploadSection.tsx    # Wrapper combining upload + table
    └── TranscriptUploadSectionWrapper.tsx  # SSR-safe wrapper
supabase/
└── migrations/
    └── 20250130_transcript_upload.sql  # Database schema
```

---

## API Endpoints

### `POST /api/uploads/transcript`

**Auth:** Required (Supabase session)

**Body:** `multipart/form-data` with `file` field (PDF only, max 10MB)

**Response:**
```json
{
  "documentId": "uuid",
  "status": "parsing" | "uploaded"
}
```

### `POST /api/events`

**Auth:** Webhook signature (`x-stu-signature` header)

**Body:**
```json
{
  "type": "user.transcript.parsed",
  "userId": "uuid",
  "documentId": "uuid",
  "courses": [
    {
      "term": "Fall 2024",
      "subject": "CS",
      "number": "142",
      "title": "Intro to Programming",
      "credits": 3,
      "grade": "A",
      "confidence": 0.95
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "coursesProcessed": 2
}
```

### `POST /api/profile/courses/bulk-upsert`

**Auth:** Required (Supabase session)

**Body:**
```json
{
  "courses": [
    {
      "term": "Fall 2024",
      "subject": "CS",
      "number": "142",
      "title": "Intro to Programming",
      "credits": 3,
      "grade": "A",
      "confidence": 0.95
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "coursesProcessed": 2,
  "courses": [...]
}
```

---

## Troubleshooting

### Upload fails with "Unauthorized"
- Check that user is logged in
- Verify Supabase auth session is valid

### Webhook fails with 401
- Verify `TRANSCRIPT_WEBHOOK_SECRET` matches on both sides
- Check `x-stu-signature` header is set correctly

### Courses don't appear after parsing
- Check `documents` table - is status `parsed`?
- Check `user_courses` table - are rows present?
- Verify `source_document` FK matches `documentId`

### Storage upload fails
- Check bucket `transcripts` exists and is private
- Verify RLS policies are applied
- Check file size (<10MB) and type (PDF only)

---

## Security Notes

- ✅ RLS policies ensure users can only see their own data
- ✅ Service role key is only used server-side in `/api/events`
- ✅ Webhook signature prevents unauthorized access
- ✅ File type and size validation on client & server
- ✅ Storage paths are scoped to `{userId}/filename.pdf`

---

## Future Enhancements

- [ ] Retry failed parses
- [ ] Support for other document types (LinkedIn PDFs, etc.)
- [ ] Bulk delete courses
- [ ] Download original transcript from storage
- [ ] Parse status notifications (toast/email)
