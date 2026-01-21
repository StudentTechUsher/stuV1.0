import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';
import type {
  DraftCourse,
  DraftPlan,
  DraftPlanInput,
  DraftTerm,
  PlanEdit,
  PlanUpdate,
} from './activeFeedbackTypes';

type RawCourse = {
  code?: string;
  courseCode?: string;
  title?: string;
  courseTitle?: string;
  credits?: number | string;
};

const DEFAULT_MIN_CREDITS = 12;
const DEFAULT_MAX_CREDITS = 18;
const DEFAULT_TARGET_CREDITS = 15;

export function createDraftPlan(input: DraftPlanInput): DraftPlan {
  const courses = extractCourses(input.courseData)
    .sort((a, b) => b.credits - a.credits);
  const terms = buildTerms(
    input.suggestedDistribution,
    input.hasTranscript ?? true,
    input.academicTerms
  );

  for (const course of courses) {
    const courseCredits = course.credits;
    const targetIndex = pickBalancedTermIndex(terms, courseCredits);

    if (targetIndex !== -1) {
      terms[targetIndex].courses.push(course);
    } else {
      const extraTerm = createExtraTerm(terms.length + 1);
      extraTerm.courses.push(course);
      terms.push(extraTerm);
    }
  }

  return { terms };
}

export function applyPlanEdit(plan: DraftPlan, edit: PlanEdit): PlanUpdate {
  if (edit.type !== 'move_course') {
    return {
      plan,
      changes: [],
      explanations: ['This edit type is not supported yet.'],
    };
  }

  const cloned = clonePlan(plan);
  const { courseId, direction } = edit;
  const sourceIndex = cloned.terms.findIndex(term =>
    term.courses.some(course => course.id === courseId)
  );

  if (sourceIndex === -1) {
    return {
      plan,
      changes: [],
      explanations: ['We could not find that course in the draft plan.'],
    };
  }

  const sourceTerm = cloned.terms[sourceIndex];
  const courseIndex = sourceTerm.courses.findIndex(course => course.id === courseId);
  const course = sourceTerm.courses[courseIndex];
  sourceTerm.courses.splice(courseIndex, 1);

  const candidateIndexes = direction === 'earlier'
    ? [...Array(sourceIndex).keys()].reverse()
    : Array.from({ length: cloned.terms.length - sourceIndex - 1 }, (_, i) => sourceIndex + 1 + i);

  const targetIndex = pickBalancedTermIndex(
    cloned.terms,
    course.credits,
    candidateIndexes
  );
  if (targetIndex !== -1) {
    const targetTerm = cloned.terms[targetIndex];
    targetTerm.courses.push(course);
    return {
      plan: cloned,
      changes: [`Moved ${course.code} to ${targetTerm.label}.`],
    };
  }

  sourceTerm.courses.splice(courseIndex, 0, course);

  return {
    plan,
    changes: [],
    explanations: [
      direction === 'earlier'
        ? 'No earlier term has enough room for that course.'
        : 'No later term has enough room for that course.',
    ],
    alternatives: candidateIndexes.length > 0
      ? ['Try a different course or reduce the target term load.']
      : ['There are no other terms available to move this course.'],
  };
}

function buildTerms(
  suggestedDistribution: SemesterAllocation[] | undefined,
  hasTranscript: boolean,
  academicTerms?: AcademicTermsConfig
): DraftTerm[] {
  if (suggestedDistribution && suggestedDistribution.length > 0) {
    if (!hasTranscript && academicTerms) {
      return buildTermsFromNextStart(suggestedDistribution, academicTerms);
    }

    return suggestedDistribution.map((term, index) => ({
      id: `${term.term}-${term.year}-${index}`,
      label: `${term.term} ${term.year}`,
      minCredits: term.minCredits,
      maxCredits: term.maxCredits,
      targetCredits: term.suggestedCredits,
      courses: [],
    }));
  }

  return Array.from({ length: 8 }, (_, index) => ({
    id: `term-${index + 1}`,
    label: `Term ${index + 1}`,
    minCredits: DEFAULT_MIN_CREDITS,
    maxCredits: DEFAULT_MAX_CREDITS,
    targetCredits: DEFAULT_TARGET_CREDITS,
    courses: [],
  }));
}

function buildTermsFromNextStart(
  suggestedDistribution: SemesterAllocation[],
  academicTerms: AcademicTermsConfig
): DraftTerm[] {
  const ranges = deriveLoadRanges(suggestedDistribution);
  const includeSecondary = suggestedDistribution.some(term => term.termType === 'secondary');
  const nextStart = getNextEligibleTerm(academicTerms, includeSecondary);

  if (!nextStart) {
    return suggestedDistribution.map((term, index) => ({
      id: `${term.term}-${term.year}-${index}`,
      label: `${term.term} ${term.year}`,
      minCredits: term.minCredits,
      maxCredits: term.maxCredits,
      targetCredits: term.suggestedCredits,
      courses: [],
    }));
  }

  const terms: DraftTerm[] = [];
  let currentIndex = nextStart.index;
  let currentYear = nextStart.year;

  for (let i = 0; i < suggestedDistribution.length; i += 1) {
    const termId = academicTerms.ordering[currentIndex];
    const termLabel = getTermLabel(termId, academicTerms);
    const termType = resolveTermType(termId, academicTerms);
    const loadRange = termType === 'secondary' ? ranges.secondary : ranges.primary;

    terms.push({
      id: `${termLabel}-${currentYear}-${i}`,
      label: `${termLabel} ${currentYear}`,
      minCredits: loadRange.min,
      maxCredits: loadRange.max,
      targetCredits: loadRange.target,
      courses: [],
    });

    const advance = getNextEligibleTerm(
      academicTerms,
      includeSecondary,
      currentIndex,
      currentYear
    );
    if (!advance) break;
    currentIndex = advance.index;
    currentYear = advance.year;
  }

  return terms;
}

function createExtraTerm(index: number): DraftTerm {
  return {
    id: `extra-term-${index}`,
    label: `Extra Term ${index}`,
    minCredits: DEFAULT_MIN_CREDITS,
    maxCredits: DEFAULT_MAX_CREDITS,
    targetCredits: DEFAULT_TARGET_CREDITS,
    courses: [],
  };
}

function extractCourses(courseData: unknown): DraftCourse[] {
  const rawCourses: RawCourse[] = [];

  if (courseData && typeof courseData === 'object') {
    const data = courseData as {
      selectedCourses?: RawCourse[];
      generalEducation?: Array<{ selectedCourses: RawCourse[] }>;
      programs?: Array<{ requirements: Array<{ selectedCourses: RawCourse[] }> }>;
      userAddedElectives?: RawCourse[];
    };

    if (Array.isArray(data.selectedCourses)) {
      rawCourses.push(...data.selectedCourses);
    }

    if (Array.isArray(data.generalEducation)) {
      data.generalEducation.forEach(req => rawCourses.push(...req.selectedCourses));
    }

    if (Array.isArray(data.programs)) {
      data.programs.forEach(program => {
        program.requirements.forEach(req => rawCourses.push(...req.selectedCourses));
      });
    }

    if (Array.isArray(data.userAddedElectives)) {
      rawCourses.push(...data.userAddedElectives);
    }
  }

  const courseMap = new Map<string, DraftCourse>();
  rawCourses.forEach((course) => {
    const code = course.code || course.courseCode;
    if (!code) return;
    if (courseMap.has(code)) return;

    const title = course.title || course.courseTitle || 'Untitled course';
    const creditsValue = typeof course.credits === 'string'
      ? Number.parseFloat(course.credits)
      : course.credits;
    const credits = Number.isFinite(creditsValue) ? Number(creditsValue) : 3;

    courseMap.set(code, {
      id: code,
      code,
      title,
      credits,
      source: 'selected',
    });
  });

  return Array.from(courseMap.values());
}

function pickBalancedTermIndex(
  terms: DraftTerm[],
  courseCredits: number,
  candidateIndexes?: number[]
): number {
  const indexes = candidateIndexes ?? terms.map((_, index) => index);
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  indexes.forEach((index) => {
    const term = terms[index];
    const currentCredits = getTermCredits(term);
    const projectedCredits = currentCredits + courseCredits;
    if (projectedCredits > term.maxCredits) return;

    const target = getTermTargetCredits(term);
    const overflow = Math.max(0, projectedCredits - target);
    const fillRatio = projectedCredits / Math.max(target, 1);
    const score = overflow * 10 + fillRatio;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getTermCredits(term: DraftTerm): number {
  return term.courses.reduce((sum, course) => sum + course.credits, 0);
}

function getTermTargetCredits(term: DraftTerm): number {
  const rawTarget = term.targetCredits ?? DEFAULT_TARGET_CREDITS;
  const clampedTarget = Math.max(term.minCredits, Math.min(term.maxCredits, rawTarget));
  return clampedTarget;
}

function deriveLoadRanges(suggestedDistribution: SemesterAllocation[]) {
  const primarySample = suggestedDistribution.find(term => term.termType === 'primary');
  const secondarySample = suggestedDistribution.find(term => term.termType === 'secondary');

  return {
    primary: {
      min: primarySample?.minCredits ?? DEFAULT_MIN_CREDITS,
      max: primarySample?.maxCredits ?? DEFAULT_MAX_CREDITS,
      target: primarySample?.suggestedCredits ?? DEFAULT_TARGET_CREDITS,
    },
    secondary: {
      min: secondarySample?.minCredits ?? DEFAULT_MIN_CREDITS,
      max: secondarySample?.maxCredits ?? DEFAULT_MAX_CREDITS,
      target: secondarySample?.suggestedCredits ?? DEFAULT_TARGET_CREDITS,
    },
  };
}

function getNextEligibleTerm(
  academicTerms: AcademicTermsConfig,
  includeSecondary: boolean,
  currentIndex?: number,
  currentYear?: number
): { termId: string; index: number; year: number } | null {
  const ordering = academicTerms.ordering || [];
  if (ordering.length === 0) return null;

  const now = new Date();
  const baseYear = currentYear ?? now.getFullYear();
  const baseMonth = now.getMonth();

  let startIndex = currentIndex;
  let startMonth = currentIndex !== undefined
    ? getTermMonth(ordering[currentIndex])
    : -1;

  if (startIndex === undefined) {
    ordering.forEach((termId, index) => {
      const month = getTermMonth(termId);
      if (month <= baseMonth && month >= startMonth) {
        startMonth = month;
        startIndex = index;
      }
    });

    if (startIndex === undefined) {
      let maxMonth = -1;
      ordering.forEach((termId, index) => {
        const month = getTermMonth(termId);
        if (month > maxMonth) {
          maxMonth = month;
          startIndex = index;
          startMonth = month;
        }
      });
    }
  }

  if (startIndex === undefined) return null;

  let nextIndex = (startIndex + 1) % ordering.length;
  let nextTermId = ordering[nextIndex];
  let guard = 0;

  while (!includeSecondary && isSecondaryTerm(nextTermId, academicTerms)) {
    nextIndex = (nextIndex + 1) % ordering.length;
    nextTermId = ordering[nextIndex];
    guard += 1;
    if (guard > ordering.length) {
      return null;
    }
  }

  const nextMonth = getTermMonth(nextTermId);
  let nextYear = currentYear ?? now.getFullYear();
  if (nextMonth < startMonth) {
    nextYear += 1;
  }

  return {
    termId: nextTermId,
    index: nextIndex,
    year: nextYear,
  };
}

function resolveTermType(
  termId: string,
  academicTerms: AcademicTermsConfig
): 'primary' | 'secondary' {
  return isSecondaryTerm(termId, academicTerms) ? 'secondary' : 'primary';
}

function isSecondaryTerm(termId: string, academicTerms: AcademicTermsConfig): boolean {
  return academicTerms.terms.secondary.some(
    term => term.id.toLowerCase() === termId.toLowerCase()
  );
}

function getTermLabel(termId: string, academicTerms: AcademicTermsConfig): string {
  const allTerms = [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
  const term = allTerms.find(t => t.id.toLowerCase() === termId.toLowerCase());
  return term?.label || termId.charAt(0).toUpperCase() + termId.slice(1);
}

function getTermMonth(termId: string): number {
  const termLower = termId.toLowerCase();
  const monthMap: Record<string, number> = {
    fall: 8,
    autumn: 8,
    winter: 0,
    spring: 4,
    summer: 5,
  };

  return monthMap[termLower] ?? 0;
}

function clonePlan(plan: DraftPlan): DraftPlan {
  return {
    terms: plan.terms.map(term => ({
      ...term,
      courses: term.courses.map(course => ({ ...course })),
    })),
  };
}
