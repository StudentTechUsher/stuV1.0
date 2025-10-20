"""
Robust transcript parser for BYU-style transcripts.
Handles BYU course work, transfer credits, AP credits, and current enrollment.
"""

import re
from dataclasses import dataclass
from typing import List, Tuple

GRADES = {"A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F","CR","NC","P","I","W","T"}

# Term header pattern: "Fall Semester 2020", "Summer Term 2020", etc.
TERM_RX = re.compile(r"(Fall|Winter|Spring|Summer)\s+(Semester|Term)\s+20\d{2}", re.I)

# BYU course row with section number
COURSE_RX = re.compile(r"""
 ^(?P<subject>[A-Z]{2,8})\s+
   (?P<number>\d{3}[A-Z]?)\s+
   (?P<section>\d{3}[A-Z]?)\s+
   (?P<title>.+?)\s+
   (?P<credits>\d+(?:\.\d{1,2})?)
   (?:\s+(?P<grade>[A-Z][\+\-]?|CR|NC|P|I|W|T))?
 \s*$
""", re.X)

# BYU course row without section (used for AP, some transfers)
COURSE_NOSEC_RX = re.compile(r"""
 ^(?P<subject>[A-Z]{2,8})\s+
   (?P<number>\d{3}[A-Z]?)\s+
   (?P<title>.+?)\s+
   (?P<credits>\d+(?:\.\d{1,2})?)
   (?:\s+(?P<grade>[A-Z][\+\-]?|CR|NC|P|I|W|T))?
 \s*$
""", re.X)

# Transfer course row with YRTRM code
TRANSFER_RX = re.compile(r"""
 ^\s*(?P<yrtrm>\d{5})\s+
   (?P<subject>[A-Z]{2,8})\s+
   (?P<number>\d{3}[A-Z]?)\s+
   (?P<title>.+?)\s+
   (?P<credits>\d+(?:\.\d{1,2})?)\s+
   (?P<grade>[A-Z][\+\-]?|CR|NC|P|I|W|T)
""", re.X)

# Skip lines that are summary/totals
SKIP_PATTERNS = [
    re.compile(r"SEM\s+HR\s+ERN", re.I),
    re.compile(r"HR\s+GRD", re.I),
    re.compile(r"GPA\s+\d", re.I),
    re.compile(r"CUMULATIVE", re.I),
    re.compile(r"TOTAL\s+CREDITS", re.I),
    re.compile(r"TEACH\s+CRS\s+SEC", re.I),  # Header row
    re.compile(r"AREA\s+NO\.", re.I),  # Header row
    re.compile(r"YRTRM\s+COURSE", re.I),  # Transfer header
]


@dataclass
class CourseRow:
    """Represents a parsed course from a transcript."""
    term: str
    subject: str
    number: str
    title: str
    credits: float
    grade: str | None
    confidence: float


def yrtrm_to_term(code: str) -> str:
    """
    Convert BYU YRTRM code to readable term.
    Format: YYYYT where T is term digit
    1 = Winter, 5 = Summer, 9 = Fall, 3 = Spring (if used)
    """
    if len(code) != 5:
        return "Unknown"

    year = code[:4]
    term_digit = code[4]

    term_map = {
        "1": "Winter",
        "3": "Spring",
        "5": "Summer",
        "9": "Fall"
    }

    term_name = term_map.get(term_digit, "Unknown")
    return f"{term_name} Term {year}"


def should_skip_line(line: str) -> bool:
    """Check if line should be skipped (headers, summaries, etc.)."""
    for pattern in SKIP_PATTERNS:
        if pattern.search(line):
            return True
    return False


def parse_text(text: str) -> Tuple[List[CourseRow], dict]:
    """
    Parse transcript text into structured course data.

    Returns:
        Tuple of (courses list, metadata dict)
    """
    lines = [l.rstrip() for l in text.splitlines() if l.strip()]
    courses: List[CourseRow] = []
    unknown_lines = 0
    current_term = "Unknown"
    in_transfer = False
    terms_found = set()

    for i, line in enumerate(lines):
        # Skip summary/header lines
        if should_skip_line(line):
            continue

        # Detect term headers
        mterm = TERM_RX.search(line)
        if mterm:
            current_term = mterm.group(0).title()
            terms_found.add(current_term)
            in_transfer = False
            continue

        # Detect transfer credits section
        if "TRANSFER CREDITS RECEIVED" in line or "ADVANCED PLACEMENT" in line.upper():
            in_transfer = True
            continue

        # Detect current enrollment section
        if "CURRENT ENROLLMENT" in line:
            in_transfer = False
            continue

        # Detect institution headers for transfers (skip but stay in transfer mode)
        if in_transfer and ("Attended from" in line or "Univ" in line):
            continue

        # Try parsing as transfer course (with YRTRM)
        if in_transfer:
            mt = TRANSFER_RX.match(line)
            if mt:
                d = mt.groupdict()
                term = yrtrm_to_term(d["yrtrm"])
                grade = d["grade"]
                title = re.sub(r"\s{2,}", " ", d["title"]).strip().title()

                courses.append(CourseRow(
                    term=term,
                    subject=d["subject"],
                    number=d["number"],
                    title=title,
                    credits=float(d["credits"]),
                    grade=grade if grade in GRADES else None,
                    confidence=0.75
                ))
                continue

        # Try parsing as regular BYU course row (with section)
        m = COURSE_RX.match(line)
        if m:
            d = m.groupdict()
            title = re.sub(r"\s{2,}", " ", d["title"]).strip().title()
            grade = d.get("grade")

            # Validate grade
            if grade and grade not in GRADES:
                grade = None
                conf = 0.7
            else:
                conf = 0.9

            courses.append(CourseRow(
                term=current_term,
                subject=d["subject"],
                number=d["number"],
                title=title,
                credits=float(d["credits"]),
                grade=grade,
                confidence=conf
            ))
            continue

        # Try parsing without section (AP credits, some formats)
        m_nosec = COURSE_NOSEC_RX.match(line)
        if m_nosec:
            d = m_nosec.groupdict()
            title = re.sub(r"\s{2,}", " ", d["title"]).strip().title()
            grade = d.get("grade")

            if grade and grade not in GRADES:
                grade = None
                conf = 0.75
            else:
                conf = 0.85

            courses.append(CourseRow(
                term=current_term,
                subject=d["subject"],
                number=d["number"],
                title=title,
                credits=float(d["credits"]),
                grade=grade,
                confidence=conf
            ))
            continue

        # Check if this might be a title continuation line
        if courses and line.strip() and not re.search(r"\d+\.\d{1,2}\s+[A-Z]{1,3}$", line):
            # Likely a continuation of the previous course title
            last_course = courses[-1]
            continuation = line.strip()

            # Only append if it looks like text (not numbers/codes)
            if not re.match(r"^\d", continuation) and len(continuation) > 2:
                last_course.title = (last_course.title + " " + continuation).strip()
                last_course.confidence -= 0.05
                continue

        # Line didn't match any pattern
        if line.strip():
            unknown_lines += 1

    metadata = {
        "unknown_lines": unknown_lines,
        "total_lines": len(lines),
        "courses_found": len(courses),
        "terms_found": sorted(list(terms_found))
    }

    return courses, metadata


def validate_course(course: CourseRow) -> bool:
    """Validate that a parsed course has valid data."""
    # Subject: 2-8 uppercase letters
    if not re.match(r"^[A-Z]{2,8}$", course.subject):
        return False

    # Number: 3 digits optionally followed by a letter
    if not re.match(r"^\d{3}[A-Z]?$", course.number):
        return False

    # Credits: reasonable range
    if not (0 <= course.credits <= 10):
        return False

    # Grade: either None (current enrollment) or in valid set
    if course.grade is not None and course.grade not in GRADES:
        return False

    return True
