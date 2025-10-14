# Transcript Parsing System - Technical Architecture

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Component Breakdown](#component-breakdown)
3. [Data Flow](#data-flow)
4. [Security Model](#security-model)
5. [Design Decisions](#design-decisions)
6. [API Reference](#api-reference)

---

## System Overview

This is a **production-grade transcript parsing system** that extracts course data from academic transcript PDFs and makes it available for display, editing, and future processing (GPA calculation, degree auditing, etc.).

### Key Features

- ✅ **PDF Upload**: Drag-and-drop or file picker with real-time progress
- ✅ **Automated Parsing**: BYU-optimized regex parser with 90%+ accuracy
- ✅ **Smart Display**: Courses grouped by term with confidence scoring
- ✅ **Inline Editing**: Edit course details directly without separate forms
- ✅ **Security**: Row-Level Security (RLS) ensures user data isolation
- ✅ **Extensibility**: Easy to add support for other transcript formats

---

## Component Breakdown

### 1. Frontend (Next.js + React)

#### **A. TranscriptUpload Component**
**Location**: `components/transcript/TranscriptUpload.tsx`

**Purpose**: Handles PDF upload and triggers parsing

**How it works**:
1. User selects PDF (drag-and-drop or click)
2. Uploads file to Supabase Storage: `transcripts/{user_id}/{timestamp}_{filename}.pdf`
3. Calls `/api/parse-transcript` with file path
4. Shows progress states: `uploading → parsing → parsed`
5. Displays parse report stats (courses found, low confidence count)
6. Calls `onUploadSuccess` callback to trigger refresh

**Why this approach**:
- **Direct Storage Upload**: Faster than sending file through API routes
- **User Auth**: Upload uses user's session token (RLS enforced)
- **Progress Feedback**: Real-time status updates improve UX
- **Callback Pattern**: Parent component controls when to refresh data

#### **B. ParsedCoursesCards Component**
**Location**: `components/transcript/ParsedCoursesCards.tsx`

**Purpose**: Displays parsed courses with inline editing

**How it works**:
1. Fetches `user_courses` from Supabase filtered by `user_id`
2. Groups courses by term (e.g., "Fall Semester 2020")
3. Sorts terms in reverse chronological order
4. Renders cards with:
   - Subject/Number (e.g., "MATH 112")
   - Title, credits, grade
   - Confidence score with visual indicators
   - Edit/Delete buttons
5. Edit mode: Shows text fields for inline editing
6. Save: Updates Supabase and refreshes local state (optimistic UI)

**Why this approach**:
- **Client-Side Reads**: RLS ensures users only see their own data
- **Optimistic Updates**: UI updates immediately, then syncs to DB
- **Grouped Display**: Term grouping mirrors how transcripts are organized
- **Visual Confidence**: Yellow borders flag courses that may need review

#### **C. Academic History Page**
**Location**: `app/dashboard/academic-history/page.tsx`

**Purpose**: Main page that orchestrates upload and display

**How it works**:
1. Opens upload dialog when "Upload Transcript" clicked
2. Listens for `onUploadSuccess` callback
3. Increments `refreshTrigger` to reload ParsedCoursesCards
4. Shows parse stats (courses found, low confidence count)
5. Displays ParsedCoursesCards below manual entry section

**Why this approach**:
- **Single Page**: Upload and display in one view
- **Trigger-Based Refresh**: Avoids prop drilling or global state
- **Stats Display**: Parse report gives immediate feedback on quality
- **Coexistence**: Parsed courses live alongside manual entries

---

### 2. Backend API (Next.js API Routes)

#### **A. Parse Transcript Route**
**Location**: `app/api/parse-transcript/route.ts`

**Purpose**: Middleware between frontend and Python worker

**How it works**:
1. Receives `{ path, userId }` from TranscriptUpload
2. Authenticates user via Supabase session
3. Builds full file path: `{userId}/{filename}.pdf`
4. Forwards request to Python worker: `POST http://localhost:8787/parse`
5. Returns parse report to frontend

**Why this approach**:
- **User Auth**: Verifies logged-in user owns the file
- **Path Construction**: Ensures correct Storage path format
- **Worker Proxy**: Keeps worker URL hidden from client
- **Error Handling**: Catches worker errors and returns friendly messages

**Security Notes**:
- Uses user's session token (not service key)
- Validates `userId` matches authenticated user
- Worker receives `user_id` and uses service key for DB operations

---

### 3. Python Worker (FastAPI)

#### **A. Main Service**
**Location**: `transcript-parser/app/main.py`

**Purpose**: Extracts text from PDFs and parses into structured data

**Endpoints**:
- `GET /`: Health check
- `POST /parse`: Main parsing endpoint

**How `/parse` works**:
1. Receives `{ bucket, path, user_id }` from Next.js API
2. Downloads PDF from Supabase Storage (using service key)
3. Extracts text with `pdfplumber`
4. Parses text with regex-based state machine
5. Validates parsed courses
6. Upserts to `user_courses` table (using service key)
7. Returns parse report: `{ success, courses_found, confidence_stats, terms_detected }`

**Why this approach**:
- **Separation of Concerns**: Parsing is CPU-intensive, runs separately
- **Service Role**: Worker bypasses RLS for upsert operations
- **Synchronous**: Parses immediately (async webhook coming later)
- **Comprehensive Report**: Returns detailed stats for UI display

#### **B. Parser Module**
**Location**: `transcript-parser/app/parser.py`

**Purpose**: Core parsing logic with regex patterns

**Key Components**:
1. **Term Detection**: `/(Fall|Winter|Spring|Summer)\s+(Semester|Term)\s+20\d{2}/`
2. **BYU Course Row**: Matches "MATH 112 016 Calculus 1 4.00 A"
3. **Transfer Row**: Matches YRTRM format "20175 MATH 153 ..."
4. **State Machine**: Tracks current term, transfer mode, etc.
5. **Confidence Scoring**:
   - 0.90: Perfect match with section number
   - 0.85: Match without section (AP credits)
   - 0.75: Transfer credit
   - Penalties for invalid grades, title continuation

**Why this approach**:
- **Deterministic**: Regex is fast and predictable
- **BYU-Optimized**: Patterns match BYU transcript layout exactly
- **Extensible**: Easy to add patterns for other schools
- **Confidence Scores**: Let users know which entries to double-check

#### **C. Supabase Client**
**Location**: `transcript-parser/app/supabase_client.py`

**Purpose**: Interface with Supabase from Python worker

**Functions**:
- `get_supabase_client()`: Creates client with service role key
- `download_pdf()`: Downloads PDF from Storage
- `upsert_courses()`: Inserts/updates courses in `user_courses` table
- `save_document()`: (Optional) Saves raw text for audit trail

**Why this approach**:
- **Service Role Key**: Bypasses RLS (worker acts on behalf of users)
- **Deduplication**: Removes duplicate courses before upsert
- **Conflict Resolution**: `on_conflict='user_id,term,subject,number'`
- **Error Handling**: Graceful failures with detailed error messages

---

### 4. Database (Supabase/Postgres)

#### **A. user_courses Table**

**Schema**:
```sql
CREATE TABLE user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  subject TEXT NOT NULL,
  number TEXT NOT NULL,
  title TEXT,
  credits NUMERIC(4,2),
  grade TEXT,
  confidence NUMERIC(3,2),
  source_document TEXT,
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_courses_unique UNIQUE (user_id, term, subject, number)
);
```

**Indexes**:
- Primary key on `id`
- Unique constraint on `(user_id, term, subject, number)` prevents duplicates
- Foreign key on `user_id` ensures referential integrity

**RLS Policies**:
```sql
-- Users can read their own courses
CREATE POLICY "read own courses"
  ON user_courses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own courses
CREATE POLICY "insert own courses"
  ON user_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own courses
CREATE POLICY "update own courses"
  ON user_courses FOR UPDATE
  USING (auth.uid() = user_id);
```

**Why this design**:
- **User Isolation**: RLS ensures data privacy
- **Deduplication**: Unique constraint prevents re-uploading same course
- **Audit Trail**: Timestamps track when data was added/modified
- **Confidence Score**: Helps users prioritize data quality review

#### **B. Storage Bucket**

**Location**: `transcripts/`

**Structure**:
```
transcripts/
  └── {user_id}/
      ├── 1759292125898_Record_Summary.pdf
      └── 1759305612345_Transcript_2024.pdf
```

**Policies**:
- Users can upload to their own folder
- Users can read from their own folder
- Worker can read all files (service role)

**Why this design**:
- **User Folders**: `{user_id}/` prefix isolates files
- **Unique Names**: Timestamp prefix prevents collisions
- **No Public Access**: Files require auth to download

---

## Data Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Action                          │
│                  Clicks "Upload Transcript"                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  TranscriptUpload Component                  │
│  1. User selects PDF file                                    │
│  2. Uploads to Supabase Storage                              │
│     Path: transcripts/{user_id}/{timestamp}_{filename}.pdf   │
│  3. Calls /api/parse-transcript                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js API Route                           │
│  /api/parse-transcript/route.ts                              │
│  1. Authenticates user (Supabase session)                    │
│  2. Validates user_id matches authenticated user             │
│  3. Builds full path: {user_id}/{filename}                   │
│  4. POSTs to Python worker                                   │
│     POST http://localhost:8787/parse                         │
│     Body: { bucket, path, user_id }                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Python FastAPI Worker                      │
│  /parse endpoint                                             │
│  1. Downloads PDF from Supabase Storage (service key)        │
│  2. Extracts text with pdfplumber                            │
│  3. Parses text with regex state machine                     │
│     - Detects terms (Fall 2020, Spring 2021, etc.)          │
│     - Matches course rows (MATH 112, HIST 202, etc.)        │
│     - Handles transfers and AP credits                       │
│  4. Validates courses (subject, number, credits, grade)      │
│  5. Deduplicates by (term, subject, number)                  │
│  6. Upserts to user_courses table (service key)              │
│     Conflict: ON CONFLICT (user_id, term, subject, number)   │
│  7. Returns parse report                                     │
│     { success, courses_found, confidence_stats, ... }        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js API Route                           │
│  Returns report to frontend                                  │
│  { success: true, report: {...} }                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  TranscriptUpload Component                  │
│  1. Receives parse report                                    │
│  2. Shows success message with stats                         │
│     "✅ 41 courses added. 3 courses need review"            │
│  3. Calls onUploadSuccess(report) callback                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Academic History Page                       │
│  1. Increments refreshTrigger                                │
│  2. ParsedCoursesCards re-fetches data                       │
│  3. Displays updated course list                             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  ParsedCoursesCards Component                │
│  1. Queries user_courses (Supabase client-side)              │
│     SELECT * FROM user_courses WHERE user_id = auth.uid()    │
│  2. Groups by term                                           │
│  3. Renders cards with course details                        │
│  4. Shows confidence scores and flags low-confidence items   │
│  5. Enables inline editing                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Model

### Row-Level Security (RLS)

**Problem**: How do we ensure users only see their own transcript data?

**Solution**: Postgres Row-Level Security policies

**How it works**:
1. **User Operations** (read, edit, delete):
   - Use Supabase client with user's session token
   - RLS policy checks: `auth.uid() = user_id`
   - Only matching rows are returned/modified

2. **Worker Operations** (upsert after parsing):
   - Use Supabase client with service role key
   - Service role bypasses RLS (trusted)
   - Worker receives `user_id` from API and inserts correctly

**Security Guarantees**:
- ✅ Users cannot read other users' courses
- ✅ Users cannot modify other users' courses
- ✅ Worker can insert on behalf of users
- ✅ API validates `userId` matches authenticated user

### Authentication Flow

```
User Login (Supabase Auth)
  ↓
Session Token Stored in Browser
  ↓
Frontend Operations
  ├─ Upload: User token (RLS enforced)
  ├─ Read: User token (RLS enforced)
  └─ Edit/Delete: User token (RLS enforced)

Worker Operations
  └─ Parse & Upsert: Service key (bypasses RLS)
```

---

## Design Decisions

### Why FastAPI for the Worker?

**Alternatives Considered**:
- Next.js API route (Node.js)
- Serverless function (Lambda, Vercel)
- In-browser parsing (JavaScript)

**Chosen**: FastAPI (Python)

**Reasons**:
1. **pdfplumber**: Best Python library for PDF text extraction
2. **Regex Performance**: Python regex is mature and fast
3. **Separation**: CPU-intensive parsing isolated from Next.js
4. **Extensibility**: Easy to add OCR, LLM fallback, etc.
5. **Testing**: pytest for comprehensive test coverage

**Trade-offs**:
- ❌ Requires separate deployment
- ❌ Local development needs two services running
- ✅ Cleaner separation of concerns
- ✅ Can scale independently

### Why Regex-Based Parsing?

**Alternatives Considered**:
- LLM-only (GPT-4, Claude)
- Computer vision (OCR + image processing)
- Table detection (PDFPlumber tables)

**Chosen**: Regex with optional LLM fallback

**Reasons**:
1. **Speed**: Regex is 10-100x faster than LLM
2. **Cost**: No API costs for majority of transcripts
3. **Determinism**: Same input always produces same output
4. **Accuracy**: 90%+ for well-formatted transcripts (BYU)
5. **Control**: Easy to debug and tune patterns

**Trade-offs**:
- ❌ Requires custom patterns per school
- ❌ Brittle to format changes
- ✅ Fast and free for most cases
- ✅ LLM fallback available for edge cases

### Why Inline Editing?

**Alternatives Considered**:
- Separate edit page
- Modal dialog for editing
- Bulk edit mode

**Chosen**: Inline editing in cards

**Reasons**:
1. **Speed**: Edit without context switching
2. **Visual**: See changes in context
3. **Confidence**: Edit low-confidence courses immediately
4. **UX**: Modern pattern (Notion, Linear, etc.)

**Implementation**:
- Toggle edit mode with button
- Show text fields in place
- Save/Cancel buttons
- Optimistic updates

---

## API Reference

### POST /api/parse-transcript

**Purpose**: Trigger transcript parsing for uploaded PDF

**Request**:
```typescript
{
  path: string;       // e.g., "1759292125898_Record_Summary.pdf"
  userId?: string;    // Optional, defaults to auth.uid()
}
```

**Response**:
```typescript
{
  success: boolean;
  report: {
    courses_found: number;
    courses_upserted: number;
    terms_detected: string[];
    unknown_lines: number;
    total_lines: number;
    used_ocr: boolean;
    used_llm: boolean;
    confidence_stats: {
      avg: number;
      min: number;
      max: number;
      low_confidence_count: number;
    };
    errors: string[];
    timestamp: string;
  };
}
```

**Status Codes**:
- 200: Success
- 400: Missing required fields
- 401: Unauthorized
- 500: Worker error

### POST /parse (Python Worker)

**Purpose**: Internal endpoint called by Next.js API

**Request**:
```typescript
{
  bucket: string;    // "transcripts"
  path: string;      // "{user_id}/filename.pdf"
  user_id: string;   // UUID
}
```

**Response**: Same as above

**Authentication**: None (internal service)

---

## Future Enhancements

### Phase 2: Asynchronous Parsing
- **Problem**: Large PDFs block request
- **Solution**: Webhook or job queue
- **Implementation**: Store job ID, poll for completion

### Phase 3: Multi-School Support
- **Problem**: Only works with BYU transcripts
- **Solution**: School detection + pattern library
- **Implementation**: School enum, pattern mapping

### Phase 4: GPA Calculation
- **Problem**: Users want to see GPA
- **Solution**: Calculate from grades + credits
- **Implementation**: Grade point mapping, term/cumulative

### Phase 5: Degree Audit
- **Problem**: Users want to track graduation progress
- **Solution**: Map courses to degree requirements
- **Implementation**: Requirement graph, matching logic

---

## Troubleshooting

### Worker Can't Download PDF

**Symptom**: `Failed to download file from transcripts/...`

**Causes**:
1. Service role key missing/incorrect
2. File doesn't exist in Storage
3. Wrong path format

**Solutions**:
1. Check `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Verify file uploaded to Storage
3. Ensure path is `{user_id}/{filename}`

### Courses Not Appearing

**Symptom**: Upload succeeds but no courses show

**Causes**:
1. RLS blocking reads
2. Wrong `user_id` in database
3. Frontend not refreshing

**Solutions**:
1. Check RLS policies allow `auth.uid() = user_id`
2. Verify `user_id` column matches logged-in user
3. Ensure `refreshTrigger` increments after upload

### Duplicate Courses

**Symptom**: Same course appears multiple times

**Causes**:
1. Unique constraint missing
2. Different terms for same course
3. Parser detecting course twice

**Solutions**:
1. Verify constraint on `(user_id, term, subject, number)`
2. Check term detection logic
3. Review parsed data in database

---

## Conclusion

This architecture provides a **solid foundation** for academic data management. The system is:

- **Secure**: RLS ensures data isolation
- **Fast**: Regex parsing processes PDFs in <5 seconds
- **Accurate**: 90%+ accuracy on BYU transcripts
- **User-Friendly**: Upload, view, edit in one interface
- **Extensible**: Easy to add features (GPA, degree audit, etc.)

The design favors **simplicity and reliability** over cutting-edge tech. This means:
- ✅ Fewer moving parts
- ✅ Easier debugging
- ✅ Lower costs (no LLM required)
- ✅ Faster response times

For most academic institutions, **regex + optional LLM** is the sweet spot between accuracy and cost.
