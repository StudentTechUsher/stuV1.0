# Transcript Parsing Setup Guide

Complete setup guide for the transcript parsing pipeline: PDF → Text → Parser → Supabase → UI

## 🎯 Quick Start

### 1. Set Up Python Worker

```bash
cd transcript-parser

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Set Up Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Add columns to user_courses
ALTER TABLE public.user_courses
  ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique constraint for upserts
CREATE UNIQUE INDEX IF NOT EXISTS user_courses_unique
  ON public.user_courses(user_id, term, subject, number);

-- Enable RLS
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "read own courses"
  ON public.user_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert own courses"
  ON public.user_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own courses"
  ON public.user_courses FOR UPDATE
  USING (auth.uid() = user_id);
```

### 3. Create Documents Table (Optional - for audit trail)

```sql
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL,
  content TEXT,
  metadata JSONB,
  document_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 4. Run the Worker Service

```bash
cd transcript-parser
uvicorn app.main:app --reload --port 8787
```

Service will be available at `http://localhost:8787`

### 5. Configure Next.js

Add to your `.env.local`:

```env
TRANSCRIPT_PARSER_URL=http://localhost:8787
```

### 6. Test the Parser

```bash
cd transcript-parser
pytest tests/test_parser.py -v
```

Expected output:
```
✓ test_parse_byu_sample PASSED
✓ test_term_detection PASSED
✓ test_byu_course_parsing PASSED
✓ test_current_enrollment_parsing PASSED
✓ test_ap_credit_parsing PASSED
✓ test_transfer_credit_parsing PASSED
✓ test_all_expected_courses_found PASSED
```

## 🚀 Usage

### Manual Parsing (Debug API)

```typescript
// Call from your Next.js app
const response = await fetch('/api/parse-transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'user-id/transcript.pdf'
  })
});

const { report } = await response.json();
console.log(`Found ${report.courses_found} courses`);
```

### Automatic Parsing (Storage Webhook)

**Option A: Supabase Webhook (Recommended)**

1. Go to Supabase Dashboard → Storage → `transcripts` bucket
2. Click **Settings** → **Webhooks**
3. Add webhook:
   - Event: `INSERT`
   - URL: `https://your-worker-url.com/parse`
   - Payload template:
   ```json
   {
     "bucket": "transcripts",
     "path": "{{record.name}}",
     "user_id": "{{record.metadata.user_id}}"
   }
   ```

**Option B: Edge Function Trigger**

If webhooks aren't available, create a Supabase Edge Function:

```typescript
// supabase/functions/parse-transcript-trigger/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()

  const workerUrl = Deno.env.get('TRANSCRIPT_PARSER_URL')

  await fetch(`${workerUrl}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket: 'transcripts',
      path: record.name,
      user_id: record.metadata?.user_id
    })
  })

  return new Response('OK', { status: 200 })
})
```

**Option C: Client-Side Trigger**

After uploading a transcript, call the parse API:

```typescript
// In your upload handler
const { data, error } = await supabase.storage
  .from('transcripts')
  .upload(`${userId}/transcript.pdf`, file)

if (!error) {
  // Trigger parsing
  await fetch('/api/parse-transcript', {
    method: 'POST',
    body: JSON.stringify({
      path: `${userId}/transcript.pdf`
    })
  })
}
```

### View Academic History

Navigate to `/academic-history` to see parsed courses grouped by term.

## 📋 Acceptance Criteria Checklist

- [ ] Python worker service running on port 8787
- [ ] Database schema updated with confidence and source_document columns
- [ ] RLS policies configured correctly
- [ ] All pytest tests passing
- [ ] Can manually parse via `/api/parse-transcript`
- [ ] Parsed courses appear in `/academic-history`
- [ ] Low confidence courses (<0.7) show warning badge
- [ ] Re-parsing is idempotent (no duplicates)
- [ ] Transfer credits parse with correct YRTRM mapping
- [ ] Current enrollment shows no grade
- [ ] AP credits parse correctly

## 🔧 Supported Transcript Formats

### BYU Course Work
```
TEACH CRS   SEC   COURSE DESCRIPTION               SEM   GRD
AREA  NO.   NO.                                    HRS

MATH  112   016   Calculus 1                       4.00  A
```

### Advanced Placement
```
BIO   100         Principles of Biology            3.00  P
```

### Transfer Credits
```
YRTRM    COURSE      COURSE DESCRIPTION        HRS   GRD
20175    MATH   153  PRE-CALCULUS I           3.33  A
```

### Current Enrollment
```
ENT   401   004     Entrepreneurial Innovation   3.00
```

## 🐛 Troubleshooting

### Worker won't start
- Check Python version (requires 3.11+)
- Verify all dependencies installed: `pip list`
- Check `.env` file exists and has correct values

### No courses parsed
- Enable LLM fallback: `USE_LLM_FALLBACK=true`
- Check PDF text extraction quality
- Review `unknown_lines` count in parse report
- Try running tests to verify parser works on sample data

### Database errors
- Verify service role key is correct (not anon key)
- Check RLS policies allow service role
- Ensure unique index exists on user_courses

### Low confidence scores
- Review source transcript formatting
- Check for unusual spacing or encoding
- Consider adding custom regex patterns

### Import errors in Academic History page
- If using custom UI components, adjust imports
- Or use basic HTML elements instead of shadcn/ui

## 📦 Deployment

### Deploy Python Worker

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Set environment variables
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...

# Deploy
railway up
```

**Fly.io:**
```bash
fly launch
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

### Update Next.js Environment

In production `.env`:
```env
TRANSCRIPT_PARSER_URL=https://your-worker.railway.app
```

## 🧪 Testing with Real Transcripts

1. Upload a test transcript via your app
2. Check the parse report in console/logs
3. Verify courses appear in `/academic-history`
4. Check confidence scores
5. Review any parsing errors

## 📊 Parse Report Example

```json
{
  "success": true,
  "courses_found": 11,
  "courses_upserted": 11,
  "terms_detected": [
    "Summer Term 2020",
    "Fall Semester 2020",
    "Fall Semester 2025"
  ],
  "unknown_lines": 8,
  "total_lines": 28,
  "used_ocr": false,
  "used_llm": false,
  "confidence_stats": {
    "avg": 0.84,
    "min": 0.75,
    "max": 0.9,
    "low_confidence_count": 2
  },
  "errors": [],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🎓 Adding Support for Other Schools

To add support for a different transcript format:

1. Get sample transcript text
2. Add to `tests/fixtures/school_name_sample.txt`
3. Update regex patterns in `app/parser.py`:
   ```python
   # Add school-specific pattern
   SCHOOL_COURSE_RX = re.compile(r"your-pattern-here")
   ```
4. Add tests in `tests/test_parser.py`
5. Update confidence scoring logic

## 📞 Support

- Check `transcript-parser/README.md` for detailed API docs
- Review test cases for expected behavior
- Enable verbose logging in worker for debugging

## ✅ Next Steps

After setup is complete:

1. Test with sample BYU transcript
2. Test with your actual transcripts
3. Set up automatic parsing (webhook or edge function)
4. Add navigation link to Academic History
5. Deploy worker to production
6. Monitor parse reports for quality
