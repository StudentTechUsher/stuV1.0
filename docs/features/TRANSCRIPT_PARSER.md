# Transcript Parser Service

Robust Python service for parsing academic transcripts (BYU-style and similar formats) into structured course data.

## Features

- **PDF Text Extraction**: Uses `pdfplumber` to extract text from transcript PDFs
- **Deterministic Parsing**: Regex-based state machine for accurate course detection
- **Multi-Format Support**: Handles BYU courses, transfer credits, AP credits, and current enrollment
- **LLM Fallback**: Optional OpenAI integration for difficult-to-parse transcripts
- **Confidence Scoring**: Assigns confidence scores to parsed courses
- **Supabase Integration**: Automatic upsert to `user_courses` table

## Architecture

```
PDF → Text Extraction → Parser → Validation → Supabase Upsert
                          ↓
                    LLM Fallback (optional)
```

## Setup

### 1. Install Dependencies

```bash
cd transcript-parser
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (has RLS bypass)

Optional:
- `OPENAI_API_KEY`: For LLM fallback on low-quality parses
- `USE_LLM_FALLBACK`: Set to `true` to enable LLM fallback

### 3. Set Up Database

Run these SQL commands in your Supabase SQL editor:

```sql
-- Add columns to user_courses table
ALTER TABLE public.user_courses
  ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 1.0;

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS user_courses_unique
  ON public.user_courses(user_id, term, subject, number);

-- Enable RLS
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "read own courses"
  ON public.user_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "upsert own courses"
  ON public.user_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own courses"
  ON public.user_courses FOR UPDATE
  USING (auth.uid() = user_id);
```

Optional: Create `documents` table for audit trail:

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
```

### 4. Run Locally

```bash
# From transcript-parser directory
uvicorn app.main:app --reload --port 8787
```

The service will be available at `http://localhost:8787`

### 5. Test the Parser

```bash
pytest tests/test_parser.py -v
```

## API Endpoints

### `POST /parse`

Parse a transcript PDF and upsert courses to Supabase.

**Request Body:**
```json
{
  "bucket": "transcripts",
  "path": "user-id/transcript.pdf",
  "user_id": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "courses_found": 15,
  "courses_upserted": 15,
  "terms_detected": ["Fall Semester 2020", "Summer Term 2020"],
  "unknown_lines": 3,
  "total_lines": 120,
  "used_ocr": false,
  "used_llm": false,
  "confidence_stats": {
    "avg": 0.87,
    "min": 0.75,
    "max": 0.9,
    "low_confidence_count": 2
  },
  "errors": [],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### `GET /`

Health check endpoint.

## Supabase Storage Webhook

To automatically trigger parsing when transcripts are uploaded:

1. Go to Supabase Dashboard → Storage → `transcripts` bucket
2. Click **Webhooks** → **Add webhook**
3. Configure:
   - **Event**: `INSERT`
   - **URL**: `https://your-worker-url.com/parse`
   - **Payload**:
   ```json
   {
     "bucket": "transcripts",
     "path": "{{record.name}}",
     "user_id": "{{record.metadata.user_id}}"
   }
   ```

## Next.js Integration

### Environment Variable

Add to your `.env.local`:

```env
TRANSCRIPT_PARSER_URL=http://localhost:8787
```

In production, point to your deployed worker URL.

### Debug API Route

The debug API route is at `/api/parse-transcript` and allows manual re-parsing:

```typescript
// Example usage
const response = await fetch('/api/parse-transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'user-id/transcript.pdf'
  })
});

const { report } = await response.json();
console.log(report);
```

### Academic History Page

Access at `/academic-history` to view all parsed courses grouped by term.

## Parser Details

### Supported Formats

1. **BYU Course Work** (with section numbers)
   ```
   MATH  112   016         Calculus 1                       4.00  A
   ```

2. **Advanced Placement** (no section)
   ```
   BIO   100               Principles of Biology            3.00  P
   ```

3. **Transfer Credits** (YRTRM format)
   ```
   20175    MATH   153  PRE-CALCULUS MATHEMATICS I    3.33  A
   ```

4. **Current Enrollment** (no grade)
   ```
   ENT   401   004         Entrepreneurial Innovation       3.00
   ```

### Confidence Scoring

- **0.90**: Regular BYU course with section number
- **0.85**: Course without section number
- **0.75**: Transfer credit
- **0.60**: LLM-extracted course
- **-0.05**: Title continuation line appended
- **-0.20**: Invalid grade detected

### Term Detection

Automatically detects terms in these formats:
- Fall Semester 2020
- Winter Semester 2021
- Spring Term 2022
- Summer Term 2020

Transfer YRTRM codes are converted:
- `20175` → Summer Term 2017
- `20201` → Winter Term 2020
- `20209` → Fall Term 2020
- `20233` → Spring Term 2023

## Deployment

### Option 1: Railway

1. Create new project on [Railway](https://railway.app)
2. Connect your repo
3. Set environment variables
4. Deploy

### Option 2: Fly.io

```bash
fly launch
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

### Option 3: Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8787"]
```

## Troubleshooting

### No courses found

- Check that PDF text extraction worked (look at `used_ocr` flag)
- Verify the transcript format matches expected patterns
- Enable LLM fallback for non-standard formats

### Low confidence scores

- Review the source document formatting
- Check for unusual spacing or line breaks
- Consider adding institution-specific regex patterns

### Database errors

- Verify RLS policies are correctly configured
- Ensure service role key is being used (bypasses RLS)
- Check unique constraint on (user_id, term, subject, number)

## Testing

Run the full test suite:

```bash
pytest tests/ -v
```

Test specific functionality:

```bash
pytest tests/test_parser.py::test_byu_course_parsing -v
```

## Contributing

To add support for a new transcript format:

1. Add sample text to `tests/fixtures/`
2. Update regex patterns in `app/parser.py`
3. Add tests in `tests/test_parser.py`
4. Update confidence scoring logic

## License

MIT
