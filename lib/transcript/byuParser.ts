// lib/transcript/byuParser.ts
// Purpose: Strip the PII header from BYU transcripts (via anchor lines) and parse courses.

export interface CourseRow {
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
  confidence: number;
}

export interface ParseMetadata {
  unknownLines: number;
  totalLines: number;
  coursesFound: number;
  termsFound: string[];
  headerRemoved: boolean;
  headerAnchor?: string;
}

export interface ParseResult {
  courses: CourseRow[];
  metadata: ParseMetadata;
}

/** Grades and shapes align with your existing parser for compatibility. */
const VALID_GRADES = new Set([
  'A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F','CR','NC','P','I','W','T',
]); // :contentReference[oaicite:2]{index=2}

/** Term header e.g., "Fall Semester 2020" or "Summer Term 2018" */
const TERM_REGEX = /(Fall|Winter|Spring|Summer)\s+(Semester|Term)\s+20\d{2}/i; // :contentReference[oaicite:3]{index=3}

/** BYU course formats (subject can include spaces like "REL A"). */
const SUBJECT_PATTERN = '[A-Z]{2,8}(?:\\s+[A-Z]{1,3})?';
const GRADE_PATTERN = '(?:[A-Z][+\\-]?|CR|NC|P|I|W|T)';

const COURSE_REGEX = new RegExp(
  `^\\s*(?<subject>${SUBJECT_PATTERN})\\s+(?<number>\\d{3}[A-Z]?)\\s+(?<section>\\d{3}[A-Z]?)\\s+(?<title>.+?)\\s+(?<credits>\\d+(?:\\.\\d{1,2})?)(?:\\s+(?<grade>${GRADE_PATTERN}))?\\s*$`
);

const COURSE_NO_SECTION_REGEX = new RegExp(
  `^\\s*(?<subject>${SUBJECT_PATTERN})\\s+(?<number>\\d{3}[A-Z]?)\\s+(?<title>.+?)\\s+(?<credits>\\d+(?:\\.\\d{1,2})?)(?:\\s+(?<grade>${GRADE_PATTERN}))?\\s*$`
);

/** Transfer/AP row with YRTRM code. */
const TRANSFER_REGEX = new RegExp(
  `^\\s*(?<yrtrm>\\d{5})\\s+(?<subject>${SUBJECT_PATTERN})\\s+(?<number>\\d{3}[A-Z]?)\\s+(?<title>.+?)\\s+(?<credits>\\d+(?:\\.\\d{1,2})?)\\s+(?<grade>${GRADE_PATTERN})`,
  'i'
); // :contentReference[oaicite:4]{index=4}

/** Continuation guard to avoid grabbing totals/headers as title continuations. */
const CONTINUATION_GUARD_REGEX = /\d+\.\d{1,2}\s+[A-Z]{1,3}$/; // :contentReference[oaicite:5]{index=5}

/** Lines we always ignore (totals/headers). */
const SKIP_PATTERNS: RegExp[] = [
  /SEM\s+HR\s+ERN/i,
  /HR\s+GRD/i,
  /GPA\s+\d/i,
  /CUMULATIVE/i,
  /TOTAL\s+CREDITS/i,
  /TEACH\s+CRS\s+SEC/i,
  /AREA\s+NO\./i,
  /YRTRM\s+COURSE/i,
]; // :contentReference[oaicite:6]{index=6}

/** Anchor lines that appear just below BYU’s PII header band. */
const HEADER_ANCHORS = [
  /DEGREES\s+AWARDED\s*-\s*BRIGHAM\s+YOUNG\s+UNIVERSITY/i,
  /BYU\s+COURSE\s+WORK/i,
  /TEACH\s+CRS\s+SEC/i,
  /^[\-\u2013\u2014]{20,}$/i,
];

const TITLE_WHITESPACE_REGEX = /\s{2,}/g;
const TITLE_CASE_WORD = /\b([A-Za-z][^\s]*)/g;

function normalizeWhitespace(v: string) {
  return v.replace(TITLE_WHITESPACE_REGEX, ' ').trim();
}
function toTitleCase(v: string) {
  return normalizeWhitespace(v)
    .toLowerCase()
    .replace(TITLE_CASE_WORD, (m) => m.charAt(0).toUpperCase() + m.slice(1));
}

/**
 * Remove PII header by dropping all lines above the first anchor.
 * Fallback: if no anchor is found, drop the first N lines defensively.
 */
function stripByuHeader(text: string): {
  sanitized: string;
  removed: boolean;
  anchor?: string;
} {
  const rawLines = text.split(/\r?\n/);
  let cutIndex = -1;
  let anchorHit: string | undefined;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const hit = HEADER_ANCHORS.find((rx) => rx.test(line));
    if (hit) {
      cutIndex = i;
      anchorHit = line;
      break;
    }
  }

  if (cutIndex === -1) {
    // Fallback: drop a conservative header band (top 25 lines)
    const FALLBACK_LINES = 25;
    const sanitized = rawLines.slice(FALLBACK_LINES).join('\n');
    return { sanitized, removed: true };
  }

  const sanitized = rawLines.slice(cutIndex).join('\n');
  return { sanitized, removed: true, anchor: anchorHit };
}

/** Convert 5-digit YRTRM code to a friendly term string. */
export function yrtrmToTerm(code: string): string {
  if (code.length !== 5) return 'Unknown';
  const year = code.slice(0, 4);
  const digit = code.slice(4);
  const map: Record<string, string> = { '1': 'Winter', '3': 'Spring', '5': 'Summer', '9': 'Fall' };
  const term = map[digit] ?? 'Unknown';
  return `${term} Term ${year}`;
} // :contentReference[oaicite:7]{index=7}

function shouldSkip(line: string) {
  return SKIP_PATTERNS.some((rx) => rx.test(line));
}

function fromGroups(
  groups: Record<string, string>,
  term: string,
  confidence: number
): CourseRow {
  const subject = normalizeWhitespace(groups.subject).toUpperCase();
  const number = groups.number.toUpperCase();
  const credits = Number(groups.credits);
  const rawGrade = groups.grade ? groups.grade.toUpperCase() : null;
  const grade = rawGrade && VALID_GRADES.has(rawGrade) ? rawGrade : null;
  const title = toTitleCase(groups.title);
  return { term, subject, number, title, credits, grade, confidence };
}

/**
 * Main entry: parse transcript text AFTER removing the header.
 * Returns BYU courses (incl. transfer/AP) plus metadata.
 */
export function parseTranscriptText(text: string): ParseResult {
  const header = stripByuHeader(text);
  const prepped = header.sanitized
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, ' ').trimEnd())
    .filter((line) => line.trim().length > 0);

  const courses: CourseRow[] = [];
  const termsFound = new Set<string>();
  let unknownLines = 0;
  let currentTerm = 'Unknown';
  let inTransfer = false;

  for (const line of prepped) {
    if (shouldSkip(line)) continue;

    const termMatch = line.match(TERM_REGEX);
    if (termMatch) {
      currentTerm = termMatch[0]
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      termsFound.add(currentTerm);
      inTransfer = false;
      continue;
    }

    const U = line.toUpperCase();
    if (U.includes('TRANSFER CREDITS RECEIVED') || U.includes('ADVANCED PLACEMENT')) {
      inTransfer = true;
      continue;
    }
    if (U.includes('CURRENT ENROLLMENT')) {
      inTransfer = false;
      continue;
    }
    if (inTransfer && (line.includes('Attended from') || line.includes('Univ'))) {
      continue;
    }

    if (inTransfer) {
      const m = TRANSFER_REGEX.exec(line);
      if (m?.groups) {
        const term = yrtrmToTerm(m.groups.yrtrm);
        courses.push(fromGroups(m.groups, term, 0.75));
        continue;
      }
    }

    const m1 = COURSE_REGEX.exec(line);
    if (m1?.groups) {
      courses.push(fromGroups(m1.groups, currentTerm, 0.9));
      continue;
    }

    const m2 = COURSE_NO_SECTION_REGEX.exec(line);
    if (m2?.groups) {
      courses.push(fromGroups(m2.groups, currentTerm, 0.85));
      continue;
    }

    const trimmed = line.trim();
    if (
      courses.length > 0 &&
      trimmed.length > 2 &&
      !/^\d/.test(trimmed) &&
      !CONTINUATION_GUARD_REGEX.test(trimmed)
    ) {
      const last = courses[courses.length - 1];
      last.title = `${last.title} ${toTitleCase(trimmed)}`.trim();
      last.confidence = Math.max(0, last.confidence - 0.05);
      continue;
    }

    if (trimmed.length > 0) unknownLines += 1;
  }

  return {
    courses,
    metadata: {
      unknownLines,
      totalLines: prepped.length,
      coursesFound: courses.length,
      termsFound: Array.from(termsFound).sort(),
      headerRemoved: header.removed,
      headerAnchor: header.anchor,
    },
  };
}

/** Same validation rules you already enforce in TS. */
export function validateCourse(course: CourseRow): boolean {
  if (!/^[A-Z]{2,8}(?:\s+[A-Z]{1,3})?$/.test(course.subject)) return false;
  if (!/^\d{3}[A-Z]?$/.test(course.number)) return false;
  if (Number.isNaN(course.credits) || course.credits < 0 || course.credits > 10) return false;
  if (course.grade !== null && !VALID_GRADES.has(course.grade)) return false;
  return true;
} // :contentReference[oaicite:8]{index=8}
