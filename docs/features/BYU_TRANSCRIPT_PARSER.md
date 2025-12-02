# BYU Transcript Parser with OpenAI Vision

## Overview

This document describes the BYU-specific transcript parsing implementation that uses OpenAI's vision API to extract course data directly from PDF transcripts without requiring text extraction or object storage.

## Key Features

### 1. Text-Based Processing
- **No storage required** - Text is extracted from PDF and sent directly to OpenAI
- **More reliable** - Text-based parsing is more accurate than vision for structured documents
- **Uses Chat Completions API** - GPT-4o or GPT-4o-mini with structured outputs

### 2. BYU-Specific Course Pattern Validation

The parser validates all courses against BYU's course code patterns:

**Subject Code:**
- 2-4 uppercase letters
- May include a space followed by a single letter
- Examples: `CS`, `MATH`, `REL A`, `ENGL`

**Course Number:**
- 3 digits
- Optionally followed by a single letter
- Examples: `142`, `112R`, `275`

**Credits:**
- Positive decimal number
- Maximum 20 credits per course

**Grade:**
- Letter grades: A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
- Special grades: P (Pass), I (Incomplete), W (Withdrawn), CR (Credit), NC (No Credit), T (Transfer)
- `null` or empty for concurrent enrollment courses without grades yet

**Term:**
- Must be present
- Example: "Fall Semester 2023", "Winter Semester 2024"

### 3. Comprehensive Validation

Uses Zod schemas to validate each course:
- ✅ Strict pattern matching
- ✅ Type safety with TypeScript
- ✅ Detailed error messages for invalid courses
- ✅ Validation report showing:
  - Total courses parsed
  - Valid courses count
  - Invalid courses count
  - Specific validation errors for each invalid course

### 4. Intelligent Fallback

If BYU parser fails, the system automatically falls back to the legacy text extraction parser.

## File Structure

```
lib/transcript/
├── byuTranscriptParserOpenAI.ts    # New BYU-specific parser
├── processor.ts                     # Main processor (updated)
├── parser.ts                        # Legacy text parser
├── pdfExtractor.ts                  # Legacy PDF text extraction
└── byuParser.ts                     # Legacy BYU pattern matching

app/api/transcript/parse/
└── route.ts                         # API route (updated)
```

## Implementation Details

### Core Function

`parseByuTranscriptWithOpenAI(pdfBuffer: Buffer, userId: string)`

Located in: `lib/transcript/byuTranscriptParserOpenAI.ts`

**Process:**
1. Extract text from PDF using pdfjs-dist
2. Send raw text to OpenAI Chat Completions API with:
   - System prompt: Instructions for BYU-specific parsing
   - User message with full transcript text
   - Structured output schema (JSON Schema with strict mode)
3. Parse response and extract courses grouped by term
4. Validate each course against BYU patterns using Zod
5. Return valid courses + validation report

### API Integration

**Endpoint:** `POST /api/transcript/parse`

**Query Parameters:**
- `useByuParser` (boolean, default: `true`) - Enable/disable BYU parser

**Example:**
```bash
# Use BYU parser (default)
POST /api/transcript/parse

# Disable BYU parser, use legacy
POST /api/transcript/parse?useByuParser=false
```

### Environment Variables

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Model selection (optional, defaults to gpt-4o-mini)
OPENAI_BYU_TRANSCRIPT_MODEL=gpt-4o        # BYU-specific override
OPENAI_TRANSCRIPT_MODEL=gpt-4o-mini       # General transcript model
OPENAI_MODEL=gpt-4o-mini                  # Fallback model
```

**Recommended Models:**
- `gpt-4o` - Highest accuracy, more expensive
- `gpt-4o-mini` - Good balance of speed and accuracy (recommended)

### Database Schema

Courses are inserted into the `user_courses` table:

```sql
CREATE TABLE user_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  term TEXT NOT NULL,
  subject TEXT NOT NULL,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  credits NUMERIC NOT NULL,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject, number, term)
);
```

## Validation Report Example

```json
{
  "totalParsed": 45,
  "validCourses": 42,
  "invalidCourses": 3,
  "validationErrors": [
    {
      "course": {
        "subject": "XYZ",
        "number": "999",
        "title": "Invalid Course"
      },
      "errors": [
        "subject: Subject must be 2-4 uppercase letters, optionally followed by space + letter"
      ]
    },
    {
      "course": {
        "subject": "CS",
        "number": "12",
        "title": "Bad Number"
      },
      "errors": [
        "number: Number must be 3 digits optionally followed by a letter"
      ]
    },
    {
      "course": {
        "subject": "MATH",
        "number": "142",
        "title": "Good Course"
      },
      "errors": [
        "credits: Credits must be positive"
      ]
    }
  ]
}
```

## Usage Example

### From Frontend

```typescript
// In TranscriptUpload component or similar
const uploadTranscript = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/transcript/parse', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (result.success) {
    console.log(`Successfully parsed ${result.report.courses_found} courses`);

    if (result.report.used_byu_parser) {
      console.log('Used BYU-specific parser');

      const validation = result.report.validation_report;
      if (validation && validation.invalidCourses > 0) {
        console.warn(`${validation.invalidCourses} courses failed validation`);
        console.log('Validation errors:', validation.validationErrors);
      }
    }
  } else {
    console.error('Parsing failed:', result.report.errors);
  }
};
```

### From Service Layer

```typescript
import { parseTranscriptFromBuffer } from '@/lib/transcript/processor';

const result = await parseTranscriptFromBuffer({
  userId: 'user-uuid',
  fileBuffer: pdfBuffer,
  fileName: 'transcript.pdf',
  useByuParser: true, // Enable BYU parser
  supabaseClient: supabase,
});
```

## Benefits Over Previous Approach

### Previous (Text Extraction + Pattern Matching)
- ❌ Unreliable text extraction from PDFs
- ❌ Failed on complex layouts or images
- ❌ Required manual parsing logic for each institution
- ❌ No handling of concurrent courses without grades

### New (OpenAI Files API + Vision + Validation)
- ✅ Directly processes PDF visually (like a human would)
- ✅ Handles complex layouts, tables, and images
- ✅ No Supabase storage required
- ✅ Automatic cleanup of OpenAI files after parsing
- ✅ Comprehensive validation with detailed error reporting
- ✅ Properly handles concurrent courses without grades
- ✅ Institution-specific naming (BYU prefix)
- ✅ Easy to extend to other institutions

## Error Handling

The parser includes comprehensive error handling:

1. **OpenAI API Errors** - Logged with request details
2. **Validation Errors** - Captured in validation report
3. **Database Errors** - Logged and returned in report
4. **Unexpected Errors** - Caught and wrapped in custom error types

All errors are logged using FERPA-compliant logging (no PII in logs).

## Testing Recommendations

1. **Happy Path:** Upload a valid BYU transcript PDF
2. **Invalid Courses:** Upload transcript with malformed course codes
3. **Concurrent Courses:** Upload transcript with courses in progress (no grades)
4. **Large Transcripts:** Test with 100+ courses
5. **Fallback:** Test with `?useByuParser=false` to verify legacy parser still works

## Future Enhancements

1. **Other Institutions:** Create similar parsers for other universities:
   - `parseUtahTranscriptWithOpenAI()`
   - `parseUvuTranscriptWithOpenAI()`
   - etc.

2. **Confidence Scores:** Add per-course confidence scores from OpenAI

3. **Human Review:** Flag low-confidence courses for manual review

4. **Batch Processing:** Support parsing multiple transcripts at once

5. **Visual Validation:** Show side-by-side PDF vs. parsed data for user verification

## Troubleshooting

### Parser Returns No Courses

1. Check `OPENAI_API_KEY` is set correctly
2. Verify PDF is valid and readable
3. Check OpenAI API logs for rate limits or errors
4. Try with `gpt-4o` instead of `gpt-4o-mini`

### Validation Errors

1. Review validation report for specific error messages
2. Check if course codes match BYU patterns
3. Consider updating validation regex if BYU changes format

### Fallback to Legacy Parser

1. Check logs for BYU parser error details
2. Verify OpenAI API is accessible
3. May indicate PDF format is not compatible with vision API

---

**Last Updated:** 2025-01-24
**Author:** Claude Code
**Status:** ✅ Implemented and Ready for Testing
