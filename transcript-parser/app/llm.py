"""
LLM fallback for low-quality or hard-to-parse transcripts.
Uses OpenAI with structured JSON output to extract courses.
"""

import os
import json
from typing import List, Optional
from openai import OpenAI


def should_use_llm_fallback(courses: List, metadata: dict, text: str) -> bool:
    """
    Determine if LLM fallback should be used based on parse quality.

    Args:
        courses: List of parsed courses
        metadata: Parse metadata with stats
        text: Raw extracted text

    Returns:
        True if LLM fallback should be used
    """
    # Don't use if disabled
    if os.getenv("USE_LLM_FALLBACK", "false").lower() != "true":
        return False

    # Use if no courses found
    if len(courses) == 0:
        return True

    # Use if high percentage of unknown lines (>25%)
    total_lines = metadata.get("total_lines", 1)
    unknown_lines = metadata.get("unknown_lines", 0)

    if unknown_lines / total_lines > 0.25:
        return True

    return False


def extract_with_llm(text: str) -> List[dict]:
    """
    Use OpenAI to extract courses from transcript text.

    Args:
        text: Raw transcript text

    Returns:
        List of course dictionaries
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")

    client = OpenAI(api_key=api_key)

    # Define the JSON schema for structured output
    schema = {
        "type": "object",
        "properties": {
            "courses": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "term": {"type": "string"},
                        "subject": {"type": "string"},
                        "number": {"type": "string"},
                        "title": {"type": "string"},
                        "credits": {"type": "number"},
                        "grade": {"type": ["string", "null"]}
                    },
                    "required": ["term", "subject", "number", "title", "credits"]
                }
            }
        },
        "required": ["courses"]
    }

    prompt = f"""Extract all courses from this academic transcript.

For each course, provide:
- term: The semester/term (e.g., "Fall Semester 2020", "Summer Term 2020")
- subject: The subject code (e.g., "MATH", "HIST", "REL A")
- number: The course number (e.g., "112", "202")
- title: The course title
- credits: The credit hours (numeric)
- grade: The letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F, CR, NC, P, I, W, T) or null if not available

IMPORTANT:
- Skip any summary lines (GPA, totals, "SEM HR ERN", etc.)
- Skip header rows
- Include both regular courses and transfer/AP credits
- For current enrollment (no grade yet), set grade to null
- Convert term codes like "20205" to readable terms (20205 = Summer 2020)

Transcript text:
{text}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise transcript parser. Extract courses exactly as they appear, with no hallucinations."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "course_extraction",
                    "schema": schema,
                    "strict": True
                }
            },
            temperature=0
        )

        result = json.loads(response.choices[0].message.content)
        courses = result.get("courses", [])

        # Add confidence score for LLM-extracted courses
        for course in courses:
            course["confidence"] = 0.6  # Lower confidence for LLM fallback

        return courses

    except Exception as e:
        print(f"LLM extraction failed: {e}")
        return []
