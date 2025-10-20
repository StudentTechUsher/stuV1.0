"""
FastAPI service for parsing academic transcripts.
Extracts text from PDFs, parses courses, and upserts to Supabase.
"""

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI

app = FastAPI()
print("Loaded URL:", os.getenv("SUPABASE_URL"))

import os
import io
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber

from .parser import parse_text, validate_course, CourseRow
from .supabase_client import download_pdf, upsert_courses, save_document
from .llm import should_use_llm_fallback, extract_with_llm


app = FastAPI(title="Transcript Parser Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Next.js domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParseRequest(BaseModel):
    """Request model for /parse endpoint."""
    bucket: str
    path: str
    user_id: str


class ParseReport(BaseModel):
    """Response model with parse results."""
    success: bool
    courses_found: int
    courses_upserted: int
    terms_detected: list[str]
    unknown_lines: int
    total_lines: int
    used_ocr: bool
    used_llm: bool
    confidence_stats: dict
    errors: list[str]
    timestamp: str


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, bool]:
    """
    Extract text from PDF using pdfplumber.

    Returns:
        Tuple of (text, used_ocr)
    """
    text_pages = []
    used_ocr = False

    try:
        pdf_file = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(page_text)

        text = "\n".join(text_pages)

        # Check if extraction was too sparse (might need OCR)
        if len(text.strip()) < 800:
            used_ocr = True
            # TODO: Implement OCR fallback with pytesseract or similar
            # For now, we'll continue with what we have

        return text, used_ocr

    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}")


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "transcript-parser",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/parse", response_model=ParseReport)
async def parse_transcript(request: ParseRequest):
    """
    Parse a transcript PDF and upsert courses to Supabase.

    Args:
        request: ParseRequest with bucket, path, and user_id

    Returns:
        ParseReport with results and statistics
    """
    errors = []
    used_llm = False

    try:
        # Step 1: Download PDF from Supabase storage
        try:
            pdf_bytes = download_pdf(request.bucket, request.path)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Failed to download PDF: {e}")

        # Step 2: Extract text from PDF
        try:
            raw_text, used_ocr = extract_text_from_pdf(pdf_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract text: {e}")

        # Step 3: Parse text into courses
        courses, metadata = parse_text(raw_text)

        # Step 4: Try LLM fallback if parse quality is low
        if should_use_llm_fallback(courses, metadata, raw_text):
            try:
                llm_courses = extract_with_llm(raw_text)
                if llm_courses:
                    # Convert LLM dict format to CourseRow objects
                    courses = [
                        CourseRow(
                            term=c["term"],
                            subject=c["subject"],
                            number=c["number"],
                            title=c["title"],
                            credits=float(c["credits"]),
                            grade=c.get("grade"),
                            confidence=c.get("confidence", 0.6)
                        )
                        for c in llm_courses
                    ]
                    used_llm = True
            except Exception as e:
                errors.append(f"LLM fallback failed: {e}")

        # Step 5: Validate courses
        valid_courses = []
        for course in courses:
            if validate_course(course):
                valid_courses.append(course)
            else:
                errors.append(f"Invalid course data: {course.subject} {course.number}")

        # Step 6: Prepare course data for Supabase
        course_dicts = [
            {
                "term": c.term,
                "subject": c.subject,
                "number": c.number,
                "title": c.title,
                "credits": c.credits,
                "grade": c.grade,
                "source_document": f"{request.bucket}/{request.path}",
                "confidence": c.confidence,
                "inserted_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            for c in valid_courses
        ]

        # Step 7: Upsert courses to Supabase
        courses_upserted = 0
        if course_dicts:
            try:
                courses_upserted = upsert_courses(request.user_id, course_dicts)
            except Exception as e:
                errors.append(f"Failed to upsert courses: {e}")

        # Step 8: Save raw text to documents table (optional audit trail)
        try:
            doc_metadata = {
                **metadata,
                "used_ocr": used_ocr,
                "used_llm": used_llm,
                "courses_found": len(valid_courses)
            }
            save_document(
                user_id=request.user_id,
                source_path=f"{request.bucket}/{request.path}",
                raw_text=raw_text,
                metadata=doc_metadata
            )
        except Exception as e:
            errors.append(f"Failed to save document: {e}")

        # Step 9: Calculate confidence statistics
        confidences = [c.confidence for c in valid_courses]
        confidence_stats = {
            "avg": sum(confidences) / len(confidences) if confidences else 0,
            "min": min(confidences) if confidences else 0,
            "max": max(confidences) if confidences else 0,
            "low_confidence_count": sum(1 for c in confidences if c < 0.7)
        }

        # Step 10: Build response report
        return ParseReport(
            success=len(errors) == 0,
            courses_found=len(valid_courses),
            courses_upserted=courses_upserted,
            terms_detected=metadata.get("terms_found", []),
            unknown_lines=metadata.get("unknown_lines", 0),
            total_lines=metadata.get("total_lines", 0),
            used_ocr=used_ocr,
            used_llm=used_llm,
            confidence_stats=confidence_stats,
            errors=errors,
            timestamp=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)
