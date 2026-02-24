'use client';

import type { Term } from '@/components/grad-planner/types';
import type { ProgramRow } from '@/types/program';
import type { ParsedCourse } from '@/lib/services/userCoursesService';
import { matchCoursesToProgram } from '@/lib/services/courseMatchingService';
import type { ProgramRequirement, ProgramRequirementsStructure, Course as RequirementCourse } from '@/types/programRequirements';
import { getCourses, getSubRequirements } from '@/types/programRequirements';
import type { ProgressCategory, OverallProgress, Requirement, Subrequirement, Course as OverviewCourse } from './types';

type CourseStatus = 'completed' | 'in-progress' | 'planned' | 'withdrawn';
type OverviewCourseStatus = 'completed' | 'in-progress' | 'planned' | 'remaining';

type NormalizedCourse = {
  code: string;
  title: string;
  credits: number;
  fulfills: string[];
  status: CourseStatus;
  grade?: string | null;
  term?: string;
};

const PROGRAM_COLORS = [
  'var(--primary)',
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
];

const CATEGORY_COLORS: Record<string, string> = {
  'General Education': '#2196f3',
  'Institutional Requirements': '#5E35B1',
  'Electives': '#9C27B0',
};

type TabCategoryType = 'major' | 'minor' | 'gen_ed';

const STATUS_PRIORITY: Record<CourseStatus, number> = {
  completed: 3,
  'in-progress': 2,
  planned: 1,
  withdrawn: 0,
};

const OVERVIEW_STATUS_PRIORITY: Record<OverviewCourseStatus, number> = {
  completed: 3,
  'in-progress': 2,
  planned: 1,
  remaining: 0,
};

const WITHDRAWN_GRADES = new Set(['W', 'WF', 'WP', 'WU']);

function normalizeCourseCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

function getProgramTabType(program: ProgramRow): TabCategoryType | null {
  const rawType = program.program_type?.toLowerCase();
  if (program.is_general_ed || rawType === 'general_education' || rawType === 'gen_ed' || rawType === 'general_ed') {
    return 'gen_ed';
  }
  if (rawType === 'major') return 'major';
  if (rawType === 'minor') return 'minor';
  return null;
}

function parseCourseCode(code: string): { subject: string; number: string } {
  const normalized = normalizeCourseCode(code);
  const subjectMatch = normalized.match(/^([A-Z]+)/i);
  const numberMatch = normalized.match(/([0-9].*)$/);
  return {
    subject: subjectMatch ? subjectMatch[1].toUpperCase() : normalized,
    number: numberMatch ? numberMatch[1] : '',
  };
}

function gradeRank(grade?: string | null): number {
  if (!grade) return -1;
  const upper = grade.trim().toUpperCase();
  if (WITHDRAWN_GRADES.has(upper)) return -2;
  const order = [
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
    'P',
  ];
  const idx = order.indexOf(upper);
  return idx === -1 ? -1 : order.length - idx;
}

function isWithdrawn(status?: string | null, grade?: string | null): boolean {
  const statusUpper = status?.toUpperCase().trim();
  if (statusUpper === 'WITHDRAWN') return true;
  const gradeUpper = grade?.toUpperCase().trim();
  return gradeUpper ? WITHDRAWN_GRADES.has(gradeUpper) : false;
}

function normalizePlanStatus(course: {
  status?: string;
  grade?: string;
  isCompleted?: boolean;
}, termActive: boolean): CourseStatus {
  if (isWithdrawn(course.status, course.grade)) {
    return 'withdrawn';
  }

  const statusLower = course.status?.toLowerCase().trim();
  const gradeLower = course.grade?.toLowerCase().trim();

  if (course.isCompleted === true || statusLower === 'completed') {
    return 'completed';
  }

  if (statusLower === 'in progress' || gradeLower === 'in progress') {
    return 'in-progress';
  }

  if (termActive) {
    return 'in-progress';
  }

  return 'planned';
}

function normalizeTranscriptStatus(course: ParsedCourse): CourseStatus {
  if (isWithdrawn(course.status, course.grade)) {
    return 'withdrawn';
  }

  switch (course.status) {
    case 'completed':
      return 'completed';
    case 'in-progress':
      return 'in-progress';
    case 'withdrawn':
      return 'withdrawn';
    default:
      return course.grade ? 'completed' : 'in-progress';
  }
}

function mergeFulfillments(existing: string[], incoming: string[]): string[] {
  const merged = new Set<string>();
  existing.forEach((item) => item && merged.add(item));
  incoming.forEach((item) => item && merged.add(item));
  return Array.from(merged);
}

function shouldReplaceCourse(existing: NormalizedCourse, candidate: NormalizedCourse): boolean {
  const priorityDiff = STATUS_PRIORITY[candidate.status] - STATUS_PRIORITY[existing.status];
  if (priorityDiff !== 0) return priorityDiff > 0;

  if (candidate.status === 'completed') {
    return gradeRank(candidate.grade) > gradeRank(existing.grade);
  }

  return false;
}

function upsertCourse(
  map: Map<string, NormalizedCourse>,
  course: NormalizedCourse
) {
  const key = normalizeCourseCode(course.code);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, course);
    return;
  }

  const fulfills = mergeFulfillments(existing.fulfills, course.fulfills);
  const next = shouldReplaceCourse(existing, course)
    ? { ...course, fulfills }
    : { ...existing, fulfills };
  map.set(key, next);
}

function inferCategoriesFromFulfills(
  fulfills: string[],
  genEdName?: string
): string[] {
  const categories = new Set<string>();

  fulfills.forEach((fulfillment) => {
    const programMatch = fulfillment.match(/^\[(.+?)\]\s+requirement/i);
    if (programMatch) {
      categories.add(programMatch[1]);
      return;
    }

    const lower = fulfillment.toLowerCase();
    if (lower.includes('elective')) {
      categories.add('Electives');
      return;
    }
    if (
      lower.includes('religion') ||
      lower.includes('byu foundations') ||
      lower.includes('foundations for student success')
    ) {
      if (genEdName) {
        categories.add(genEdName);
      } else {
        categories.add('General Education');
      }
      return;
    }

    if (genEdName) {
      categories.add(genEdName);
    } else {
      categories.add('General Education');
    }
  });

  return Array.from(categories);
}

function toParsedCourse(course: NormalizedCourse, index: number): ParsedCourse {
  const { subject, number } = parseCourseCode(course.code);
  return {
    id: `${normalizeCourseCode(course.code)}-${index}`,
    term: course.term ?? '',
    subject,
    number,
    title: course.title || course.code,
    credits: course.credits,
    grade: course.grade ?? null,
    status: course.status === 'completed'
      ? 'completed'
      : course.status === 'withdrawn'
        ? 'withdrawn'
        : 'in-progress',
  };
}

function getProgramColor(index: number): string {
  return PROGRAM_COLORS[index % PROGRAM_COLORS.length];
}

type RequirementTotals = {
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  progress: number;
};

function isGenEdFormat(requirements: unknown): requirements is Record<string, unknown>[] {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return false;
  }

  const first = requirements[0];
  if (typeof first !== 'object' || first === null) {
    return false;
  }

  const firstObj = first as Record<string, unknown>;
  return 'subtitle' in firstObj && 'requirement' in firstObj && 'blocks' in firstObj;
}

function convertGenEdToProgramRequirement(
  genEdReq: Record<string, unknown>,
  index: number
): ProgramRequirement {
  const subtitle = (genEdReq.subtitle as string) || `Requirement ${index + 1}`;
  const requirementObj = genEdReq.requirement as Record<string, unknown> | undefined;
  const requirementIndex = (requirementObj?.index as number | undefined) || index + 1;
  const blocks = genEdReq.blocks as unknown[] | undefined;
  const rule = requirementObj?.rule as Record<string, unknown> | undefined;
  const ruleType = typeof rule?.type === 'string' ? rule.type.toLowerCase() : undefined;
  const ruleUnit = typeof rule?.unit === 'string' ? rule.unit.toLowerCase() : undefined;
  const minCount = typeof rule?.min_count === 'number' ? rule.min_count : undefined;
  const minCredits = typeof rule?.min === 'number' ? rule.min : undefined;

  let requirementType: ProgramRequirement['type'] = 'allOf';
  let constraints: Record<string, unknown> | undefined;

  if (ruleType === 'sum' || ruleUnit === 'credits' || ruleUnit === 'hours') {
    const minTotalCredits = minCredits ?? minCount;
    if (typeof minTotalCredits === 'number') {
      requirementType = 'creditBucket';
      constraints = { minTotalCredits };
    }
  } else if (ruleUnit === 'courses' || ruleUnit === 'options') {
    if (typeof minCount === 'number') {
      requirementType = 'chooseNOf';
      constraints = { n: minCount };
    }
  }

  return {
    requirementId: requirementIndex,
    description: subtitle,
    type: requirementType,
    ...(constraints ? { constraints } : {}),
    blocks,
  } as ProgramRequirement;
}

function parseProgramRequirements(program: ProgramRow): ProgramRequirement[] {
  if (!program.requirements) {
    return [];
  }

  let parsed: unknown = program.requirements;

  try {
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
  } catch (error) {
    console.warn('Failed to parse program requirements:', error);
    return [];
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const candidate = parsed as ProgramRequirementsStructure;
    if (Array.isArray(candidate.programRequirements)) {
      return candidate.programRequirements;
    }

    const keys = Object.keys(parsed);
    const numericKeys = keys.filter((key) => /^\d+$/.test(key));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => (parsed as Record<string, ProgramRequirement>)[key])
        .filter(Boolean);
    }
  }

  if (Array.isArray(parsed)) {
    if (isGenEdFormat(parsed)) {
      return parsed.map((req, index) => convertGenEdToProgramRequirement(req, index));
    }

    if (parsed.every((req) => typeof req === 'object' && req !== null && 'requirementId' in req)) {
      return parsed as ProgramRequirement[];
    }
  }

  return [];
}

function getRequirementRuleDescription(requirement: ProgramRequirement): string {
  switch (requirement.type) {
    case 'chooseNOf': {
      const count = requirement.constraints?.n;
      return count ? `Complete ${count} course${count === 1 ? '' : 's'}` : 'Complete required courses';
    }
    case 'creditBucket': {
      const credits = requirement.constraints?.minTotalCredits;
      return credits ? `Complete ${credits} credits` : 'Complete required credits';
    }
    case 'optionGroup':
      return 'Choose one track';
    case 'sequence':
      return 'Complete in sequence';
    case 'noteOnly':
      return 'Information only';
    case 'allOf':
    default:
      return 'Complete all courses';
  }
}

function getRequirementCopy(requirement: ProgramRequirement): { title: string; description: string } {
  const title = requirement.description || `Requirement ${requirement.requirementId}`;
  const description = requirement.notes
    || requirement.otherRequirement
    || requirement.sequencingNotes
    || (Array.isArray(requirement.steps) ? requirement.steps.join(' ') : '')
    || getRequirementRuleDescription(requirement);

  return { title, description };
}

function extractSubject(code: string): string {
  const normalized = code.replace(/[\s-]/g, '');
  const match = normalized.match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : '';
}

function doesRequirementCourseMatch(
  userCourseCode: string,
  requirementCourseCode: string,
  allowSubjectMatch: boolean
): boolean {
  const normalizedUserCode = normalizeCourseCode(userCourseCode);
  const normalizedReqCode = normalizeCourseCode(requirementCourseCode);

  if (normalizedUserCode === normalizedReqCode) {
    return true;
  }

  const reqCodeWithoutX = normalizedReqCode.replace(/X+$/g, '');
  if (reqCodeWithoutX && normalizedUserCode.startsWith(reqCodeWithoutX)) {
    return true;
  }

  const reqHasNumber = /\d/.test(normalizedReqCode);
  if (allowSubjectMatch || !reqHasNumber) {
    const userSubject = extractSubject(userCourseCode);
    const reqSubject = extractSubject(requirementCourseCode);
    if (userSubject && reqSubject && userSubject === reqSubject) {
      return true;
    }
  }

  return false;
}

function findBestMatchingCourse(
  requirementCourseCode: string,
  courses: NormalizedCourse[],
  allowSubjectMatch: boolean
): NormalizedCourse | null {
  let bestMatch: NormalizedCourse | null = null;

  courses.forEach((course) => {
    if (!doesRequirementCourseMatch(course.code, requirementCourseCode, allowSubjectMatch)) {
      return;
    }

    if (!bestMatch || shouldReplaceCourse(bestMatch, course)) {
      bestMatch = course;
    }
  });

  return bestMatch;
}

function toOverviewStatus(status: CourseStatus): OverviewCourseStatus {
  if (status === 'completed' || status === 'in-progress' || status === 'planned') {
    return status;
  }
  return 'remaining';
}

function dedupeRequirementCourses(courses: RequirementCourse[]): RequirementCourse[] {
  const seen = new Set<string>();
  const deduped: RequirementCourse[] = [];

  courses.forEach((course) => {
    const key = normalizeCourseCode(course.code);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(course);
  });

  return deduped;
}

function buildRequirementCourses(
  requirementCourses: RequirementCourse[],
  normalizedCourses: NormalizedCourse[],
  idPrefix: string,
  allowSubjectMatch: boolean
): OverviewCourse[] {
  return requirementCourses.map((reqCourse, index) => {
    const match = findBestMatchingCourse(reqCourse.code, normalizedCourses, allowSubjectMatch);
    const status = match ? toOverviewStatus(match.status) : 'remaining';
    const normalizedReqCode = normalizeCourseCode(reqCourse.code);
    const showMatchedCode = match && /X/.test(normalizedReqCode);
    const code = showMatchedCode ? match.code : reqCourse.code;

    return {
      id: `${idPrefix}-${normalizeCourseCode(code)}-${index}`,
      code,
      title: match?.title || reqCourse.title || reqCourse.code,
      credits: match?.credits ?? reqCourse.credits ?? 0,
      status,
      term: match?.term,
    };
  });
}

function mergeCourseLists(existing: OverviewCourse[], incoming: OverviewCourse[]): OverviewCourse[] {
  const map = new Map<string, OverviewCourse>();

  const addCourse = (course: OverviewCourse) => {
    const key = normalizeCourseCode(course.code);
    const current = map.get(key);
    if (!current) {
      map.set(key, course);
      return;
    }

    if (OVERVIEW_STATUS_PRIORITY[course.status] > OVERVIEW_STATUS_PRIORITY[current.status]) {
      map.set(key, course);
    }
  };

  existing.forEach(addCourse);
  incoming.forEach(addCourse);

  return Array.from(map.values());
}

function countCoursesByStatus(courses: OverviewCourse[]): Record<OverviewCourseStatus, number> {
  return courses.reduce<Record<OverviewCourseStatus, number>>(
    (totals, course) => {
      totals[course.status] += 1;
      return totals;
    },
    { completed: 0, 'in-progress': 0, planned: 0, remaining: 0 }
  );
}

function sumCreditsByStatus(courses: OverviewCourse[]): Record<OverviewCourseStatus, number> {
  return courses.reduce<Record<OverviewCourseStatus, number>>(
    (totals, course) => {
      totals[course.status] += course.credits || 0;
      return totals;
    },
    { completed: 0, 'in-progress': 0, planned: 0, remaining: 0 }
  );
}

function allocateTotals(
  totals: { completed: number; inProgress: number; planned: number },
  total: number
): { completed: number; inProgress: number; planned: number; remaining: number } {
  if (total <= 0) {
    return { completed: 0, inProgress: 0, planned: 0, remaining: 0 };
  }

  let remaining = total;
  const completed = Math.min(totals.completed, remaining);
  remaining -= completed;
  const inProgress = Math.min(totals.inProgress, remaining);
  remaining -= inProgress;
  const planned = Math.min(totals.planned, remaining);
  remaining -= planned;

  return { completed, inProgress, planned, remaining: Math.max(remaining, 0) };
}

function inferRequirementType(requirement: ProgramRequirement): string {
  // If type is explicitly set, use it (except allOf which might be a fallback)
  if (requirement.type && requirement.type !== 'allOf') {
    return requirement.type;
  }

  // Try to infer from description
  if (requirement.description) {
    const desc = requirement.description.toLowerCase();
    // Check for "N of M" pattern
    if (/\b(\d+)\s+(?:of|out of)\b/.test(desc)) {
      return 'chooseNOf';
    }
    // Check for "N credits/hours" pattern
    if (/\b(\d+)\s+(?:credit|hour)/.test(desc)) {
      return 'creditBucket';
    }
  }

  // Default to the requirement's type (likely 'allOf')
  return requirement.type || 'allOf';
}

function computeTotalsForRequirement(
  requirement: ProgramRequirement,
  courses: OverviewCourse[]
): RequirementTotals {
  const hasTextOnly = Boolean(
    requirement.otherRequirement
    || (Array.isArray(requirement.steps) && requirement.steps.length > 0)
  );

  if (requirement.type === 'noteOnly' && courses.length === 0) {
    return { total: 1, completed: 0, inProgress: 0, planned: 0, remaining: 1, progress: 0 };
  }

  // Infer the actual requirement type based on constraints or description
  const effectiveType = inferRequirementType(requirement);

  if (effectiveType === 'creditBucket') {
    // Try to get credits from constraints, or extract from description like "Complete 6 hours"
    let creditsRequired = requirement.constraints?.minTotalCredits;
    let extractedFromDescription = false;
    if (!creditsRequired && requirement.description) {
      const match = requirement.description.match(/\b(\d+)\s+(?:hour|credit)/i);
      if (match) {
        creditsRequired = parseInt(match[1], 10);
        extractedFromDescription = true;
      }
    }
    creditsRequired = creditsRequired ?? 0;
    const creditTotals = sumCreditsByStatus(courses);
    const allocated = allocateTotals(
      {
        completed: creditTotals.completed,
        inProgress: creditTotals['in-progress'],
        planned: creditTotals.planned,
      },
      creditsRequired
    );
    const progress = allocated.completed + allocated.inProgress + allocated.planned;

    if (process.env.NODE_ENV === 'development') {
      console.log('[CreditBucket]', {
        description: requirement.description,
        constraints: requirement.constraints,
        creditsRequired,
        extractedFromDescription,
        creditTotals,
        allocated,
        courses: courses.length,
      });
    }

    return {
      total: creditsRequired,
      completed: allocated.completed,
      inProgress: allocated.inProgress,
      planned: allocated.planned,
      remaining: Math.max(creditsRequired - progress, 0),
      progress,
    };
  }

  if (effectiveType === 'chooseNOf') {
    // Try to get N from constraints, or extract from description like "Complete 1 of 4"
    let requiredCount = requirement.constraints?.n;
    let extractedFromDescription = false;
    if (!requiredCount && requirement.description) {
      const match = requirement.description.match(/\b(\d+)\s+(?:of|out of)\b/i);
      if (match) {
        requiredCount = parseInt(match[1], 10);
        extractedFromDescription = true;
      }
    }
    requiredCount = requiredCount ?? courses.length;
    const counts = countCoursesByStatus(courses);
    const allocated = allocateTotals(
      {
        completed: counts.completed,
        inProgress: counts['in-progress'],
        planned: counts.planned,
      },
      requiredCount
    );
    const progress = allocated.completed + allocated.inProgress + allocated.planned;

    if (process.env.NODE_ENV === 'development') {
      console.log('[ChooseNOf]', {
        description: requirement.description,
        constraints: requirement.constraints,
        requiredCount,
        extractedFromDescription,
        counts,
        allocated,
        courses: courses.length,
      });
    }

    return {
      total: requiredCount,
      completed: allocated.completed,
      inProgress: allocated.inProgress,
      planned: allocated.planned,
      remaining: Math.max(requiredCount - progress, 0),
      progress,
    };
  }

  if (courses.length === 0 && hasTextOnly) {
    return { total: 1, completed: 0, inProgress: 0, planned: 0, remaining: 1, progress: 0 };
  }

  const counts = countCoursesByStatus(courses);
  const total = courses.length;
  const completed = counts.completed;
  const inProgress = counts['in-progress'];
  const planned = counts.planned;
  const progress = completed + inProgress + planned;

  return {
    total,
    completed,
    inProgress,
    planned,
    remaining: Math.max(total - progress, 0),
    progress,
  };
}

function sumTotals(a: RequirementTotals, b: RequirementTotals): RequirementTotals {
  return {
    total: a.total + b.total,
    completed: a.completed + b.completed,
    inProgress: a.inProgress + b.inProgress,
    planned: a.planned + b.planned,
    remaining: a.remaining + b.remaining,
    progress: a.progress + b.progress,
  };
}

function pickBestTotals(totalsList: RequirementTotals[]): RequirementTotals {
  if (totalsList.length === 0) {
    return { total: 0, completed: 0, inProgress: 0, planned: 0, remaining: 0, progress: 0 };
  }

  return totalsList.reduce((best, current) => {
    const bestRatio = best.total > 0 ? best.progress / best.total : 0;
    const currentRatio = current.total > 0 ? current.progress / current.total : 0;
    if (currentRatio > bestRatio) return current;
    if (currentRatio === bestRatio && current.progress > best.progress) return current;
    return best;
  });
}

function getRequirementStatus(totals: RequirementTotals): 'completed' | 'in-progress' | 'not-started' {
  if (totals.total > 0 && totals.completed >= totals.total) {
    return 'completed';
  }
  if (totals.completed + totals.inProgress + totals.planned > 0) {
    return 'in-progress';
  }
  return 'not-started';
}

// DEBUG: Log requirements with potential status issues
function logRequirementStatus(title: string, totals: RequirementTotals, status: ReturnType<typeof getRequirementStatus>) {
  if (process.env.NODE_ENV === 'development') {
    if (totals.progress > 0 && status !== 'completed') {
      console.log(`[RequirementStatus] "${title}": status=${status}, completed=${totals.completed}/${totals.total} (progress=${totals.progress})`);
    }
  }
}

function summarizeRequirement(
  requirement: ProgramRequirement,
  normalizedCourses: NormalizedCourse[],
  idPrefix: string,
  allowSubjectMatch: boolean
): { totals: RequirementTotals; courses: OverviewCourse[] } {
  if (requirement.type === 'optionGroup') {
    const optionSummaries = requirement.options.map((option, index) =>
      summarizeRequirementGroup(option.requirements, normalizedCourses, `${idPrefix}-opt-${index}`, allowSubjectMatch)
    );
    const bestSummary = optionSummaries.reduce<{ totals: RequirementTotals; courses: OverviewCourse[] } | null>(
      (best, current) => {
        if (!best) return current;
        const bestRatio = best.totals.total > 0 ? best.totals.progress / best.totals.total : 0;
        const currentRatio = current.totals.total > 0 ? current.totals.progress / current.totals.total : 0;
        if (currentRatio > bestRatio) return current;
        if (currentRatio === bestRatio && current.totals.progress > best.totals.progress) return current;
        return best;
      },
      null
    );
    return bestSummary ?? { totals: pickBestTotals(optionSummaries.map((summary) => summary.totals)), courses: [] };
  }

  if (requirement.type === 'sequence') {
    const sequenceCourses = requirement.sequence.flatMap((seq) => seq.courses);
    const courses = buildRequirementCourses(
      dedupeRequirementCourses(sequenceCourses),
      normalizedCourses,
      idPrefix,
      allowSubjectMatch
    );
    const totals = computeTotalsForRequirement(requirement, courses);
    return { totals, courses };
  }

  const subRequirements = getSubRequirements(requirement);
  const directCourses = dedupeRequirementCourses(getCourses(requirement) ?? []);

  if (subRequirements && subRequirements.length > 0) {
    let totals: RequirementTotals = { total: 0, completed: 0, inProgress: 0, planned: 0, remaining: 0, progress: 0 };
    let courses: OverviewCourse[] = [];

    subRequirements.forEach((subReq, index) => {
      const summary = summarizeRequirement(subReq, normalizedCourses, `${idPrefix}-${index}`, allowSubjectMatch);
      totals = sumTotals(totals, summary.totals);
      courses = mergeCourseLists(courses, summary.courses);
    });

    if (directCourses.length > 0) {
      const directCourseItems = buildRequirementCourses(
        directCourses,
        normalizedCourses,
        `${idPrefix}-direct`,
        allowSubjectMatch
      );
      const directTotals = computeTotalsForRequirement(requirement, directCourseItems);
      totals = sumTotals(totals, directTotals);
      courses = mergeCourseLists(courses, directCourseItems);
    }

    return { totals, courses };
  }

  const courses = buildRequirementCourses(directCourses, normalizedCourses, idPrefix, allowSubjectMatch);
  const totals = computeTotalsForRequirement(requirement, courses);
  return { totals, courses };
}

function summarizeRequirementGroup(
  requirements: ProgramRequirement[],
  normalizedCourses: NormalizedCourse[],
  idPrefix: string,
  allowSubjectMatch: boolean
): { totals: RequirementTotals; courses: OverviewCourse[] } {
  let totals: RequirementTotals = { total: 0, completed: 0, inProgress: 0, planned: 0, remaining: 0, progress: 0 };
  let courses: OverviewCourse[] = [];

  requirements.forEach((requirement, index) => {
    const summary = summarizeRequirement(requirement, normalizedCourses, `${idPrefix}-${index}`, allowSubjectMatch);
    totals = sumTotals(totals, summary.totals);
    courses = mergeCourseLists(courses, summary.courses);
  });

  return { totals, courses };
}

function toSubrequirement(
  id: string,
  title: string,
  description: string,
  totals: RequirementTotals,
  courses: OverviewCourse[]
): Subrequirement {
  const status = getRequirementStatus(totals);
  logRequirementStatus(title, totals, status);
  return {
    id,
    title,
    description,
    progress: totals.progress,
    total: totals.total,
    status,
    completed: totals.completed,
    inProgress: totals.inProgress,
    planned: totals.planned,
    remaining: totals.remaining,
    courses,
  };
}

function buildRequirementsForProgram(
  program: ProgramRow,
  normalizedCourses: NormalizedCourse[]
): Requirement[] {
  const requirements = parseProgramRequirements(program);
  if (requirements.length === 0) {
    return [];
  }

  const allowSubjectMatch = false;

  return requirements.map((requirement, index) => {
    const { title, description } = getRequirementCopy(requirement);
    let totals: RequirementTotals = { total: 0, completed: 0, inProgress: 0, planned: 0, remaining: 0, progress: 0 };
    let subrequirements: Subrequirement[] | undefined;
    let courses: OverviewCourse[] | undefined;

    if (requirement.type === 'optionGroup') {
      subrequirements = requirement.options.map((option, optionIndex) => {
        const summary = summarizeRequirementGroup(
          option.requirements,
          normalizedCourses,
          `${index}-option-${optionIndex}`,
          allowSubjectMatch
        );
        const optionTotals = summary.totals;
        const optionTitle = option.trackName || `Option ${option.trackId}`;
        const optionDescription = option.trackName ? `Track ${option.trackId}` : 'Track option';
        return toSubrequirement(
          `${requirement.requirementId}-${option.trackId}`,
          optionTitle,
          optionDescription,
          optionTotals,
          summary.courses
        );
      });

      totals = pickBestTotals(subrequirements.map((subreq) => ({
        total: subreq.total,
        completed: subreq.completed,
        inProgress: subreq.inProgress,
        planned: subreq.planned,
        remaining: subreq.remaining,
        progress: subreq.progress,
      })));
    } else if (requirement.type === 'sequence') {
      subrequirements = requirement.sequence.map((sequence, sequenceIndex) => {
        const sequenceCourses = buildRequirementCourses(
          dedupeRequirementCourses(sequence.courses),
          normalizedCourses,
          `${index}-sequence-${sequenceIndex}`,
          allowSubjectMatch
        );
        const sequenceTotals = computeTotalsForRequirement(requirement, sequenceCourses);
        const sequenceTitle = sequence.term || sequence.cohort || `Sequence ${sequence.sequenceId}`;
        const sequenceDescription = sequence.term || sequence.cohort || 'Sequence requirement';
        return toSubrequirement(
          `${requirement.requirementId}-sequence-${sequence.sequenceId}`,
          sequenceTitle,
          sequenceDescription,
          sequenceTotals,
          sequenceCourses
        );
      });

      totals = subrequirements.reduce(
        (acc, subreq) => sumTotals(acc, {
          total: subreq.total,
          completed: subreq.completed,
          inProgress: subreq.inProgress,
          planned: subreq.planned,
          remaining: subreq.remaining,
          progress: subreq.progress,
        }),
        { total: 0, completed: 0, inProgress: 0, planned: 0, remaining: 0, progress: 0 }
      );
    } else {
      const subRequirements = getSubRequirements(requirement);
      const directCourses = dedupeRequirementCourses(getCourses(requirement) ?? []);

      if (subRequirements && subRequirements.length > 0) {
        subrequirements = subRequirements.map((subReq, subIndex) => {
          const summary = summarizeRequirement(
            subReq,
            normalizedCourses,
            `${index}-${subIndex}`,
            allowSubjectMatch
          );
          const copy = getRequirementCopy(subReq);
          return toSubrequirement(
            `${requirement.requirementId}-${subReq.requirementId}`,
            copy.title,
            copy.description,
            summary.totals,
            summary.courses
          );
        });

        if (directCourses.length > 0) {
          const directCourseItems = buildRequirementCourses(
            directCourses,
            normalizedCourses,
            `${index}-direct`,
            allowSubjectMatch
          );
          const directTotals = computeTotalsForRequirement(requirement, directCourseItems);
          subrequirements.unshift(
            toSubrequirement(
              `${requirement.requirementId}-direct`,
              'Required Courses',
              'Courses required for this section',
              directTotals,
              directCourseItems
            )
          );
        }

        totals = subrequirements.reduce(
          (acc, subreq) => sumTotals(acc, {
            total: subreq.total,
            completed: subreq.completed,
            inProgress: subreq.inProgress,
            planned: subreq.planned,
            remaining: subreq.remaining,
            progress: subreq.progress,
          }),
          { total: 0, completed: 0, inProgress: 0, planned: 0, remaining: 0, progress: 0 }
        );
      } else {
        courses = buildRequirementCourses(
          directCourses,
          normalizedCourses,
          `${index}-course`,
          allowSubjectMatch
        );
        totals = computeTotalsForRequirement(requirement, courses);
      }
    }

    const status = getRequirementStatus(totals);
    logRequirementStatus(title, totals, status);
    return {
      id: index + 1,
      title,
      description,
      progress: totals.progress,
      total: totals.total,
      status,
      completed: totals.completed,
      inProgress: totals.inProgress,
      planned: totals.planned,
      remaining: totals.remaining,
      subrequirements,
      courses,
    };
  });
}

function computeTargetCredits(
  categoryName: string,
  assignedCredits: number,
  programsByName: Map<string, ProgramRow>,
  genEdProgram: ProgramRow | null
): number {
  const program = programsByName.get(categoryName);
  if (program?.target_total_credits) {
    return Math.max(program.target_total_credits, assignedCredits);
  }

  if (genEdProgram && categoryName === genEdProgram.name && genEdProgram.target_total_credits) {
    return Math.max(genEdProgram.target_total_credits, assignedCredits);
  }

  return Math.max(assignedCredits, 0);
}

function computeOverallTargetCredits(
  programs: ProgramRow[],
  genEdProgram: ProgramRow | null
): number {
  let total = programs.reduce((sum, program) => {
    const credits = typeof program.target_total_credits === 'number' ? program.target_total_credits : 0;
    return sum + credits;
  }, 0);

  if (genEdProgram) {
    const alreadyIncluded = programs.some((program) => String(program.id) === String(genEdProgram.id));
    if (!alreadyIncluded) {
      total += typeof genEdProgram.target_total_credits === 'number'
        ? genEdProgram.target_total_credits
        : 0;
    }
  }

  return total;
}

export function buildPlanProgress(args: {
  terms: Term[];
  programs: ProgramRow[];
  genEdProgram?: ProgramRow | null;
  transcriptCourses?: ParsedCourse[];
}): { categories: ProgressCategory[]; overallProgress: OverallProgress } {
  const { terms, programs, transcriptCourses = [] } = args;
  const genEdProgram = args.genEdProgram ?? null;

  const courseMap = new Map<string, NormalizedCourse>();

  terms.forEach((term) => {
    const termActive = term.is_active === true;
    (term.courses ?? []).forEach((course) => {
      if (!course.code) return;
      const normalized: NormalizedCourse = {
        code: course.code,
        title: course.title || course.code,
        credits: typeof course.credits === 'number' ? course.credits : 0,
        fulfills: Array.isArray(course.fulfills) ? course.fulfills : [],
        status: normalizePlanStatus(course, termActive),
        grade: (course as { grade?: string }).grade ?? null,
        term: term.term,
      };
      upsertCourse(courseMap, normalized);
    });
  });

  transcriptCourses.forEach((course) => {
    const code = `${course.subject} ${course.number}`.trim();
    if (!code) return;
    const normalized: NormalizedCourse = {
      code,
      title: course.title || code,
      credits: typeof course.credits === 'number' ? course.credits : 0,
      fulfills: [],
      status: normalizeTranscriptStatus(course),
      grade: course.grade ?? null,
      term: course.term,
    };
    upsertCourse(courseMap, normalized);
  });

  const normalizedCourses = Array.from(courseMap.values()).filter(
    (course) => course.status !== 'withdrawn'
  );

  const parsedCourses = normalizedCourses.map((course, index) =>
    toParsedCourse(course, index)
  );

  const requirementsByCategory = new Map<string, Requirement[]>();
  programs.forEach((program) => {
    const requirements = buildRequirementsForProgram(program, normalizedCourses);
    if (requirements.length > 0) {
      requirementsByCategory.set(program.name, requirements);
    }
  });
  if (genEdProgram) {
    const requirements = buildRequirementsForProgram(genEdProgram, normalizedCourses);
    if (requirements.length > 0) {
      requirementsByCategory.set(genEdProgram.name, requirements);
    }
  }

  const courseMatches = new Map<string, Set<string>>();

  programs.forEach((program) => {
    const matches = matchCoursesToProgram(parsedCourses, program);
    matches.matchedCourses.forEach((matched) => {
      const key = normalizeCourseCode(`${matched.subject} ${matched.number}`);
      const set = courseMatches.get(key) ?? new Set<string>();
      set.add(program.name);
      courseMatches.set(key, set);
    });
  });

  if (genEdProgram) {
    const matches = matchCoursesToProgram(parsedCourses, genEdProgram, { allowSubjectMatch: true });
    matches.matchedCourses.forEach((matched) => {
      const key = normalizeCourseCode(`${matched.subject} ${matched.number}`);
      const set = courseMatches.get(key) ?? new Set<string>();
      set.add(genEdProgram.name);
      courseMatches.set(key, set);
    });
  }

  const categoryTotals = new Map<string, { completed: number; inProgress: number; planned: number }>();

  const registerCategory = (name: string) => {
    if (!categoryTotals.has(name)) {
      categoryTotals.set(name, { completed: 0, inProgress: 0, planned: 0 });
    }
  };

  programs.forEach((program) => registerCategory(program.name));
  if (genEdProgram) {
    registerCategory(genEdProgram.name);
  }

  normalizedCourses.forEach((course) => {
    const fulfillsCategories = inferCategoriesFromFulfills(course.fulfills, genEdProgram?.name);
    const matchKey = normalizeCourseCode(course.code);
    const matchedCategories = courseMatches.get(matchKey) ? Array.from(courseMatches.get(matchKey)!) : [];
    const categories = fulfillsCategories.length > 0 ? fulfillsCategories : matchedCategories;

    const resolvedCategories = categories.length > 0 ? categories : ['Electives'];
    resolvedCategories.forEach((category) => {
      registerCategory(category);
      const totals = categoryTotals.get(category);
      if (!totals) return;
      if (course.status === 'completed') {
        totals.completed += course.credits;
      } else if (course.status === 'in-progress') {
        totals.inProgress += course.credits;
      } else if (course.status === 'planned') {
        totals.planned += course.credits;
      }
    });
  });

  const programsByName = new Map(programs.map((program) => [program.name, program]));
  const programOrder = new Map(programs.map((program, index) => [program.name, index]));
  const programTabTypeByName = new Map<string, TabCategoryType>();

  programs.forEach((program) => {
    const tabType = getProgramTabType(program);
    if (tabType) {
      programTabTypeByName.set(program.name, tabType);
    }
  });
  if (genEdProgram) {
    programTabTypeByName.set(genEdProgram.name, 'gen_ed');
  }

  const categories: ProgressCategory[] = Array.from(categoryTotals.entries())
    .map(([name, totals]) => {
      const assignedCredits = totals.completed + totals.inProgress + totals.planned;
      const totalCredits = computeTargetCredits(
        name,
        assignedCredits,
        programsByName,
        genEdProgram
      );
      const remaining = Math.max(totalCredits - assignedCredits, 0);
      const percentComplete = totalCredits > 0
        ? Math.round((totals.completed / totalCredits) * 100)
        : 0;

      let color = CATEGORY_COLORS[name] || '#71717a';
      if (programsByName.has(name)) {
        const programIndex = programs.findIndex((program) => program.name === name);
        color = getProgramColor(programIndex === -1 ? 0 : programIndex);
      } else if (genEdProgram && name === genEdProgram.name) {
        color = CATEGORY_COLORS['General Education'];
      }

      return {
        name,
        color,
        totalCredits,
        percentComplete,
        completed: totals.completed,
        inProgress: totals.inProgress,
        planned: totals.planned,
        remaining,
        requirements: requirementsByCategory.get(name) ?? [],
      };
    })
    .filter((category) => category.totalCredits > 0 || category.completed > 0 || category.inProgress > 0 || category.planned > 0)
    .sort((a, b) => {
      const orderFor = (name: string) => {
        if (programOrder.has(name)) {
          return { group: 0, index: programOrder.get(name) ?? 0 };
        }
        if (genEdProgram && name === genEdProgram.name) {
          return { group: 1, index: 0 };
        }
        if (name === 'General Education') {
          return { group: 1, index: 1 };
        }
        if (name === 'Institutional Requirements') {
          return { group: 2, index: 0 };
        }
        if (name === 'Electives') {
          return { group: 3, index: 0 };
        }
        return { group: 4, index: 0 };
      };

      const aOrder = orderFor(a.name);
      const bOrder = orderFor(b.name);
      if (aOrder.group !== bOrder.group) return aOrder.group - bOrder.group;
      if (aOrder.index !== bOrder.index) return aOrder.index - bOrder.index;
      return a.name.localeCompare(b.name);
    });

  const totalByTabType = { major: 0, minor: 0, gen_ed: 0 };
  categories.forEach((category) => {
    const tabType = programTabTypeByName.get(category.name);
    if (tabType) {
      totalByTabType[tabType] += 1;
    }
  });

  const runningIndex = { major: 0, minor: 0, gen_ed: 0 };
  const categoriesWithTabs = categories.map((category) => {
    const tabType = programTabTypeByName.get(category.name);
    if (tabType) {
      runningIndex[tabType] += 1;
      const baseLabel = tabType === 'major' ? 'Major' : tabType === 'minor' ? 'Minor' : 'Gen Ed';
      const label = totalByTabType[tabType] > 1 ? `${baseLabel} ${runningIndex[tabType]}` : baseLabel;
      return { ...category, tabLabel: label };
    }

    if (category.name === 'Institutional Requirements') {
      return { ...category, tabLabel: 'Institutional' };
    }
    if (category.name === 'General Education') {
      return { ...category, tabLabel: 'Gen Ed' };
    }
    if (category.name === 'Electives') {
      return { ...category, tabLabel: 'Electives' };
    }
    return category;
  });

  const overallCompletedCredits = normalizedCourses.reduce(
    (sum, course) => sum + (course.status === 'completed' ? course.credits : 0),
    0
  );
  const overallInProgressCredits = normalizedCourses.reduce(
    (sum, course) => sum + (course.status === 'in-progress' ? course.credits : 0),
    0
  );
  const overallPlannedCredits = normalizedCourses.reduce(
    (sum, course) => sum + (course.status === 'planned' ? course.credits : 0),
    0
  );

  const plannedTotalCredits = overallCompletedCredits + overallInProgressCredits + overallPlannedCredits;
  const targetCredits = computeOverallTargetCredits(programs, genEdProgram);
  const totalCredits = targetCredits > 0 ? Math.max(targetCredits, plannedTotalCredits) : plannedTotalCredits;
  const remainingCredits = Math.max(totalCredits - plannedTotalCredits, 0);
  const totalCourses = normalizedCourses.length;
  const completedCourses = normalizedCourses.filter((course) => course.status === 'completed').length;

  const overallProgress: OverallProgress = {
    percentComplete: totalCredits > 0 ? Math.round((overallCompletedCredits / totalCredits) * 100) : 0,
    totalCredits,
    completedCredits: overallCompletedCredits,
    inProgressCredits: overallInProgressCredits,
    plannedCredits: overallPlannedCredits,
    remainingCredits,
    totalCourses,
    completedCourses,
  };

  return { categories: categoriesWithTabs, overallProgress };
}
