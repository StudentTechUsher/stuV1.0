"""
Tests for transcript parser.
Validates parsing of BYU-style transcripts with various course formats.
"""

import pytest
from pathlib import Path
from app.parser import parse_text, yrtrm_to_term, validate_course, CourseRow


@pytest.fixture
def byu_sample_text():
    """Load BYU sample transcript text."""
    fixture_path = Path(__file__).parent / "fixtures" / "byu_sample.txt"
    return fixture_path.read_text()


def test_parse_byu_sample(byu_sample_text):
    """Test parsing of complete BYU sample transcript."""
    courses, metadata = parse_text(byu_sample_text)

    # Should find all courses
    assert len(courses) > 0, "Should parse at least one course"

    # Check metadata
    assert "unknown_lines" in metadata
    assert "terms_found" in metadata


def test_term_detection(byu_sample_text):
    """Test that all terms are correctly detected."""
    courses, metadata = parse_text(byu_sample_text)

    terms = metadata.get("terms_found", [])

    # Should detect these specific terms
    expected_terms = [
        "Summer Term 2020",
        "Fall Semester 2020",
        "Fall Semester 2025"
    ]

    for expected in expected_terms:
        assert expected in terms, f"Should detect term: {expected}"


def test_byu_course_parsing(byu_sample_text):
    """Test parsing of regular BYU courses with section numbers."""
    courses, _ = parse_text(byu_sample_text)

    # Find MATH 112 (Calculus 1)
    math_course = next((c for c in courses if c.subject == "MATH" and c.number == "112"), None)
    assert math_course is not None, "Should find MATH 112"
    assert math_course.credits == 4.00
    assert math_course.grade == "A"
    assert "Calculus" in math_course.title
    assert math_course.confidence >= 0.85

    # Find REL A 275 (subject with space)
    rel_course = next((c for c in courses if c.subject == "REL A" and c.number == "275"), None)
    assert rel_course is not None, "Should find REL A 275"
    assert rel_course.credits == 2.00
    assert rel_course.grade == "A-"


def test_current_enrollment_parsing(byu_sample_text):
    """Test parsing of current enrollment (no grade)."""
    courses, _ = parse_text(byu_sample_text)

    # Find ENT 401 (current enrollment)
    ent_course = next((c for c in courses if c.subject == "ENT" and c.number == "401"), None)
    assert ent_course is not None, "Should find ENT 401 in current enrollment"
    assert ent_course.credits == 3.00
    assert ent_course.grade is None, "Current enrollment should have no grade"
    assert ent_course.term == "Fall Semester 2025"


def test_ap_credit_parsing(byu_sample_text):
    """Test parsing of Advanced Placement credits (no section)."""
    courses, _ = parse_text(byu_sample_text)

    # Find BIO 100 (AP credit)
    bio_course = next((c for c in courses if c.subject == "BIO" and c.number == "100"), None)
    assert bio_course is not None, "Should find BIO 100 AP credit"
    assert bio_course.credits == 3.00
    assert bio_course.grade == "P"


def test_transfer_credit_parsing(byu_sample_text):
    """Test parsing of transfer credits with YRTRM codes."""
    courses, _ = parse_text(byu_sample_text)

    # Find MATH 153 transfer (20175 = Summer 2017)
    math_transfer = next(
        (c for c in courses if c.subject == "MATH" and c.number == "153"),
        None
    )
    assert math_transfer is not None, "Should find MATH 153 transfer"
    assert math_transfer.credits == 3.33
    assert math_transfer.grade == "A"
    assert "2017" in math_transfer.term, "Should convert YRTRM to readable term"
    assert math_transfer.confidence == 0.75  # Lower confidence for transfers

    # Find ENGLIS 101 transfer (20185 = Summer 2018)
    english_transfer = next(
        (c for c in courses if c.subject == "ENGLIS" and c.number == "101"),
        None
    )
    assert english_transfer is not None, "Should find ENGLIS 101 transfer"
    assert english_transfer.credits == 3.00
    assert english_transfer.grade == "A-"
    assert "2018" in english_transfer.term


def test_yrtrm_conversion():
    """Test YRTRM code to term conversion."""
    assert yrtrm_to_term("20175") == "Summer Term 2017"
    assert yrtrm_to_term("20201") == "Winter Term 2020"
    assert yrtrm_to_term("20209") == "Fall Term 2020"
    assert yrtrm_to_term("20233") == "Spring Term 2023"


def test_validation():
    """Test course validation logic."""
    # Valid course
    valid = CourseRow(
        term="Fall Semester 2020",
        subject="MATH",
        number="112",
        title="Calculus 1",
        credits=4.0,
        grade="A",
        confidence=0.9
    )
    assert validate_course(valid) is True

    # Invalid subject (too short)
    invalid_subject = CourseRow(
        term="Fall Semester 2020",
        subject="M",
        number="112",
        title="Test",
        credits=3.0,
        grade="A",
        confidence=0.9
    )
    assert validate_course(invalid_subject) is False

    # Invalid credits (too high)
    invalid_credits = CourseRow(
        term="Fall Semester 2020",
        subject="MATH",
        number="112",
        title="Test",
        credits=15.0,
        grade="A",
        confidence=0.9
    )
    assert validate_course(invalid_credits) is False

    # Invalid grade
    invalid_grade = CourseRow(
        term="Fall Semester 2020",
        subject="MATH",
        number="112",
        title="Test",
        credits=3.0,
        grade="Z",
        confidence=0.9
    )
    assert validate_course(invalid_grade) is False


def test_summary_lines_ignored(byu_sample_text):
    """Test that summary/GPA lines are not parsed as courses."""
    courses, _ = parse_text(byu_sample_text)

    # Should not have any courses with "SEM HR ERN" or "GPA" in subject
    for course in courses:
        assert "SEM" not in course.subject
        assert "GPA" not in course.subject
        assert "ERN" not in course.subject


def test_confidence_scores(byu_sample_text):
    """Test that confidence scores are assigned appropriately."""
    courses, _ = parse_text(byu_sample_text)

    # Regular BYU courses should have high confidence (0.85-0.9)
    regular_courses = [c for c in courses if c.term == "Fall Semester 2020"]
    assert all(c.confidence >= 0.85 for c in regular_courses)

    # Transfer courses should have lower confidence (0.75)
    transfer_courses = [c for c in courses if "2017" in c.term or "2018" in c.term]
    assert all(c.confidence == 0.75 for c in transfer_courses)


def test_all_expected_courses_found(byu_sample_text):
    """Test that all expected courses are found in the sample."""
    courses, _ = parse_text(byu_sample_text)

    expected_courses = [
        ("HIST", "202"),    # Summer 2020
        ("REL A", "275"),   # Summer 2020
        ("ENT", "381"),     # Fall 2020
        ("MATH", "112"),    # Fall 2020
        ("MKTG", "201"),    # Fall 2020
        ("PHY S", "100"),   # Fall 2020
        ("REL C", "130"),   # Fall 2020
        ("ENT", "401"),     # Current enrollment
        ("BIO", "100"),     # AP credit
        ("MATH", "153"),    # Transfer
        ("ENGLIS", "101"),  # Transfer
    ]

    for subject, number in expected_courses:
        found = any(c.subject == subject and c.number == number for c in courses)
        assert found, f"Should find {subject} {number}"

    # Should have exactly these courses (no extras)
    assert len(courses) == len(expected_courses), f"Expected {len(expected_courses)} courses, found {len(courses)}"
