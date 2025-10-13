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
}

export interface ParseResult {
  courses: CourseRow[];
  metadata: ParseMetadata;
}

const VALID_GRADES = new Set([
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
  'F',
  'CR',
  'NC',
  'P',
  'I',
  'W',
  'T',
]);

const TERM_REGEX = /(Fall|Winter|Spring|Summer)\s+(Semester|Term)\s+20\d{2}/i;

const SUBJECT_PATTERN = '[A-Z]{2,8}(?:\\s+[A-Z]{1,3})?';
const GRADE_PATTERN = '(?:[A-Z][+\\-]?|CR|NC|P|I|W|T)';

const COURSE_REGEX = new RegExp(
  `^\\s*(?<subject>${SUBJECT_PATTERN})\\s+(?<number>\\d{3}[A-Z]?)\\s+(?<section>\\d{3}[A-Z]?)\\s+(?<title>.+?)\\s+(?<credits>\\d+(?:\\.\\d{1,2})?)(?:\\s+(?<grade>${GRADE_PATTERN}))?\\s*$`
);

const COURSE_NO_SECTION_REGEX = new RegExp(
  `^\\s*(?<subject>${SUBJECT_PATTERN})\\s+(?<number>\\d{3}[A-Z]?)\\s+(?<title>.+?)\\s+(?<credits>\\d+(?:\\.\\d{1,2})?)(?:\\s+(?<grade>${GRADE_PATTERN}))?\\s*$`
);

const TRANSFER_REGEX = new RegExp(
  `^\\s*(?<yrtrm>\\d{5})\\s+(?<subject>${SUBJECT_PATTERN})\\s+(?<number>\\d{3}[A-Z]?)\\s+(?<title>.+?)\\s+(?<credits>\\d+(?:\\.\\d{1,2})?)\\s+(?<grade>${GRADE_PATTERN})`,
  'i'
);

const CONTINUATION_GUARD_REGEX = /\d+\.\d{1,2}\s+[A-Z]{1,3}$/;

const SKIP_PATTERNS: RegExp[] = [
  /SEM\s+HR\s+ERN/i,
  /HR\s+GRD/i,
  /GPA\s+\d/i,
  /CUMULATIVE/i,
  /TOTAL\s+CREDITS/i,
  /TEACH\s+CRS\s+SEC/i,
  /AREA\s+NO\./i,
  /YRTRM\s+COURSE/i,
];

const TITLE_WHITESPACE_REGEX = /\s{2,}/g;

const TITLE_CASE_REGEX = /\b([A-Za-z][^\s]*)/g;

function normalizeWhitespace(value: string): string {
  return value.replace(TITLE_WHITESPACE_REGEX, ' ').trim();
}

function toTitleCase(value: string): string {
  return normalizeWhitespace(value).toLowerCase().replace(TITLE_CASE_REGEX, (match) => {
    return match.charAt(0).toUpperCase() + match.slice(1);
  });
}

export function yrtrmToTerm(code: string): string {
  if (code.length !== 5) {
    return 'Unknown';
  }

  const year = code.slice(0, 4);
  const termDigit = code.slice(4);

  const termNameMap: Record<string, string> = {
    '1': 'Winter',
    '3': 'Spring',
    '5': 'Summer',
    '9': 'Fall',
  };

  const termName = termNameMap[termDigit] ?? 'Unknown';
  return `${termName} Term ${year}`;
}

function shouldSkipLine(line: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(line));
}

function parseCourseFromMatch(
  groups: Record<string, string>,
  term: string,
  confidence: number
): CourseRow {
  const subject = normalizeWhitespace(groups.subject).toUpperCase();
  const number = groups.number.toUpperCase();

  const credits = Number(groups.credits);
  const gradeRaw = groups.grade ? groups.grade.toUpperCase() : null;
  const grade = gradeRaw && VALID_GRADES.has(gradeRaw) ? gradeRaw : null;

  const title = toTitleCase(groups.title);

  let adjustedConfidence = confidence;
  if (gradeRaw && !grade) {
    adjustedConfidence = Math.min(confidence, 0.75);
  }

  return {
    term,
    subject,
    number,
    title,
    credits,
    grade,
    confidence: adjustedConfidence,
  };
}

export function parseTranscriptText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, ' ').trimEnd())
    .filter((line) => line.trim().length > 0);

  const courses: CourseRow[] = [];
  let unknownLines = 0;
  let currentTerm = 'Unknown';
  let inTransfer = false;
  const termsFound = new Set<string>();

  for (const line of lines) {
    if (shouldSkipLine(line)) {
      continue;
    }

    const termMatch = line.match(TERM_REGEX);
    if (termMatch) {
      currentTerm = termMatch[0]
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      termsFound.add(currentTerm);
      inTransfer = false;
      continue;
    }

    const upperLine = line.toUpperCase();
    if (upperLine.includes('TRANSFER CREDITS RECEIVED') || upperLine.includes('ADVANCED PLACEMENT')) {
      inTransfer = true;
      continue;
    }

    if (upperLine.includes('CURRENT ENROLLMENT')) {
      inTransfer = false;
      continue;
    }

    if (inTransfer && (line.includes('Attended from') || line.includes('Univ'))) {
      continue;
    }

    if (inTransfer) {
      const match = TRANSFER_REGEX.exec(line);
      if (match?.groups) {
        const term = yrtrmToTerm(match.groups.yrtrm);
        const course = parseCourseFromMatch(match.groups, term, 0.75);
        courses.push(course);
        continue;
      }
    }

    const courseMatch = COURSE_REGEX.exec(line);
    if (courseMatch?.groups) {
      const course = parseCourseFromMatch(courseMatch.groups, currentTerm, 0.9);
      courses.push(course);
      continue;
    }

    const altMatch = COURSE_NO_SECTION_REGEX.exec(line);
    if (altMatch?.groups) {
      const course = parseCourseFromMatch(altMatch.groups, currentTerm, 0.85);
      courses.push(course);
      continue;
    }

    const trimmed = line.trim();
    if (
      courses.length > 0 &&
      trimmed.length > 2 &&
      !/^\d/.test(trimmed) &&
      !CONTINUATION_GUARD_REGEX.test(trimmed)
    ) {
      const lastCourse = courses[courses.length - 1];
      lastCourse.title = `${lastCourse.title} ${toTitleCase(trimmed)}`.trim();
      lastCourse.confidence = Math.max(0, lastCourse.confidence - 0.05);
      continue;
    }

    if (trimmed.length > 0) {
      unknownLines += 1;
    }
  }

  const metadata: ParseMetadata = {
    unknownLines,
    totalLines: lines.length,
    coursesFound: courses.length,
    termsFound: Array.from(termsFound).sort(),
  };

  return { courses, metadata };
}

export function validateCourse(course: CourseRow): boolean {
  if (!/^[A-Z]{2,8}(?:\s+[A-Z]{1,3})?$/.test(course.subject)) {
    return false;
  }

  if (!/^\d{3}[A-Z]?$/.test(course.number)) {
    return false;
  }

  if (Number.isNaN(course.credits) || course.credits < 0 || course.credits > 10) {
    return false;
  }

  if (course.grade !== null && !VALID_GRADES.has(course.grade)) {
    return false;
  }

  return true;
}

