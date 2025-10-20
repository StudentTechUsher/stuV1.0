"""
Supabase client helper for transcript parser service (patched for current schema).
"""

import os
from typing import Optional
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client using service role key.
    This bypasses RLS for server-side operations.
    """
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not service_key:
        raise ValueError(
            "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )

    return create_client(url, service_key)


def download_pdf(bucket: str, path: str, expires_in: int = 3600) -> bytes:
    """
    Download a PDF file from Supabase storage.
    """
    client = get_supabase_client()
    response = client.storage.from_(bucket).download(path)

    if not response:
        raise ValueError(f"Failed to download file from {bucket}/{path}")

    return response


def upsert_courses(user_id: str, courses: list[dict]) -> int:
    """
    Upsert parsed courses into user_courses table, avoiding duplicate rows per (user_id, term, subject, number).
    """
    if not courses:
        return 0

    client = get_supabase_client()

    # Add user_id to each course
    for course in courses:
        course["user_id"] = user_id

    # ✅ Deduplicate courses by (term, subject, number)
    seen = set()
    unique_courses = []
    for course in courses:
        key = (course["term"], course["subject"], course["number"])
        if key not in seen:
            seen.add(key)
            unique_courses.append(course)

    # ✅ Upsert with conflict resolution
    response = (
        client.table("user_courses")
        .upsert(
            unique_courses,
            on_conflict="user_id,term,subject,number"
        )
        .execute()
    )

    return len(response.data) if response.data else 0


def save_document(
    user_id: str,
    source_path: str,
    raw_text: str,
    metadata: Optional[dict] = None
) -> Optional[str]:
    """
    Stubbed-out version for systems without a `documents` table.
    Logs transcript metadata to console instead of inserting to Supabase.
    """
    print(f"[audit] Skipping save_document() — no `documents` table found.")
    print(f"User: {user_id}, File: {source_path}, Metadata: {metadata}")
    return None
