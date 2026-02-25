type PlanCourse = Record<string, unknown>;

export type AutomaticRepairPhase =
  | 'major_fill'
  | 'minor_fill'
  | 'gen_ed_fill'
  | 'elective_fill';

export type AutomaticValidationIssueCode =
  | 'duplicate_course'
  | 'completed_course_replanned'
  | 'missing_requirement'
  | 'credit_envelope_violation';

export type AutomaticValidationIssue = {
  code: AutomaticValidationIssueCode;
  message: string;
  phaseHint: AutomaticRepairPhase;
  details?: Record<string, unknown>;
};

export type AutomaticValidationResult = {
  valid: boolean;
  issues: AutomaticValidationIssue[];
  suggestedRepairPhases: AutomaticRepairPhase[];
};

export type NormalizedAutomaticPlan = {
  plan: Array<{
    term: string;
    courses: PlanCourse[];
    credits_planned?: number;
  }>;
};

type RequirementDescriptor = {
  requirementId: string;
  courseCodes: Set<string>;
  phaseHint: AutomaticRepairPhase;
};

const PHASE_ORDER: AutomaticRepairPhase[] = [
  'major_fill',
  'minor_fill',
  'gen_ed_fill',
  'elective_fill',
];

function normalizeCourseCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function parseCredits(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isHistoricalCourse(course: PlanCourse): boolean {
  if (course.isCompleted === true) return true;
  const status = typeof course.status === 'string' ? course.status.toLowerCase() : '';
  if (status.includes('completed') || status.includes('in-progress') || status.includes('in progress')) {
    return true;
  }
  const source = typeof course.source === 'string' ? course.source.toLowerCase() : '';
  return source.includes('institutional') || source.includes('transcript');
}

function isRetakeCourse(course: PlanCourse): boolean {
  if (course.retake === true || course.isRetake === true) return true;
  const notes = typeof course.notes === 'string' ? course.notes.toLowerCase() : '';
  const reason = typeof course.reason === 'string' ? course.reason.toLowerCase() : '';
  return notes.includes('retake') || reason.includes('retake');
}

function isPassingGrade(grade: string): boolean {
  const normalized = grade.trim().toUpperCase();
  if (!normalized) return true;
  if (normalized === 'F' || normalized === 'E' || normalized === 'W' || normalized === 'I') return false;
  if (normalized.includes('WITHDRAW')) return false;
  if (normalized.includes('INCOMPLETE')) return false;
  return true;
}

function collectCompletedTranscriptCourses(payload: Record<string, unknown>): Set<string> {
  const completed = new Set<string>();
  const takenCourses = Array.isArray(payload.takenCourses) ? payload.takenCourses : [];
  for (const rawCourse of takenCourses) {
    if (!rawCourse || typeof rawCourse !== 'object') continue;
    const course = rawCourse as Record<string, unknown>;
    const code = normalizeCourseCode(course.code);
    if (!code) continue;
    const status = typeof course.status === 'string' ? course.status.toLowerCase() : '';
    const grade = typeof course.grade === 'string' ? course.grade : '';
    const isCompletedStatus = status.includes('completed');
    if (isCompletedStatus && isPassingGrade(grade)) {
      completed.add(code);
      continue;
    }
    if (!status && isPassingGrade(grade)) {
      // Some sources omit status but still provide completed grade.
      completed.add(code);
    }
  }
  return completed;
}

function collectRequirementDescriptors(payload: Record<string, unknown>): RequirementDescriptor[] {
  const descriptors: RequirementDescriptor[] = [];

  const programList = Array.isArray(payload.programs) ? payload.programs : [];
  for (const rawProgram of programList) {
    if (!rawProgram || typeof rawProgram !== 'object') continue;
    const program = rawProgram as Record<string, unknown>;
    const programTypeRaw = typeof program.programType === 'string' ? program.programType.toLowerCase() : '';
    const requirements = Array.isArray(program.requirements) ? program.requirements : [];
    for (const rawRequirement of requirements) {
      if (!rawRequirement || typeof rawRequirement !== 'object') continue;
      const requirement = rawRequirement as Record<string, unknown>;
      const requirementIdRaw =
        typeof requirement.requirementId === 'string'
          ? requirement.requirementId
          : typeof requirement.requirementDescription === 'string'
          ? requirement.requirementDescription
          : 'requirement';
      const selectedCourses = Array.isArray(requirement.selectedCourses) ? requirement.selectedCourses : [];
      const courseCodes = new Set<string>();
      for (const rawCourse of selectedCourses) {
        if (!rawCourse || typeof rawCourse !== 'object') continue;
        const code = normalizeCourseCode((rawCourse as Record<string, unknown>).code);
        if (code) {
          courseCodes.add(code);
        }
      }
      if (courseCodes.size === 0) continue;
      const phaseHint: AutomaticRepairPhase =
        programTypeRaw === 'minor'
          ? 'minor_fill'
          : 'major_fill';
      descriptors.push({
        requirementId: requirementIdRaw,
        courseCodes,
        phaseHint,
      });
    }
  }

  const genEdList = Array.isArray(payload.generalEducation) ? payload.generalEducation : [];
  for (const rawRequirement of genEdList) {
    if (!rawRequirement || typeof rawRequirement !== 'object') continue;
    const requirement = rawRequirement as Record<string, unknown>;
    const requirementIdRaw =
      typeof requirement.requirementId === 'string'
        ? requirement.requirementId
        : typeof requirement.requirementDescription === 'string'
        ? requirement.requirementDescription
        : 'gen-ed';
    const selectedCourses = Array.isArray(requirement.selectedCourses) ? requirement.selectedCourses : [];
    const courseCodes = new Set<string>();
    for (const rawCourse of selectedCourses) {
      if (!rawCourse || typeof rawCourse !== 'object') continue;
      const code = normalizeCourseCode((rawCourse as Record<string, unknown>).code);
      if (code) {
        courseCodes.add(code);
      }
    }
    if (courseCodes.size === 0) continue;
    descriptors.push({
      requirementId: requirementIdRaw,
      courseCodes,
      phaseHint: 'gen_ed_fill',
    });
  }

  return descriptors;
}

function collectPlannedCourseCodes(plan: NormalizedAutomaticPlan): Set<string> {
  const planned = new Set<string>();
  for (const term of plan.plan) {
    for (const rawCourse of term.courses) {
      const code = normalizeCourseCode(rawCourse.code);
      if (!code) continue;
      if (isHistoricalCourse(rawCourse)) continue;
      planned.add(code);
    }
  }
  return planned;
}

function buildCreditEnvelopeMap(payload: Record<string, unknown>) {
  const envelopes = new Map<string, { minCredits: number; maxCredits: number }>();
  const suggested = Array.isArray(payload.suggestedDistribution) ? payload.suggestedDistribution : [];

  for (const rawTerm of suggested) {
    if (!rawTerm || typeof rawTerm !== 'object') continue;
    const term = rawTerm as Record<string, unknown>;
    const termLabel = typeof term.term === 'string' ? term.term.trim() : '';
    const year = typeof term.year === 'number' ? term.year : null;
    if (!termLabel) continue;
    const minCredits = parseCredits(term.minCredits);
    const maxCredits = parseCredits(term.maxCredits);
    const normalizedKey = year && !termLabel.match(/\d{4}/)
      ? `${termLabel} ${year}`.toLowerCase()
      : termLabel.toLowerCase();
    envelopes.set(normalizedKey, { minCredits, maxCredits });
  }

  return envelopes;
}

function sortRepairPhases(phases: Set<AutomaticRepairPhase>): AutomaticRepairPhase[] {
  return PHASE_ORDER.filter(phase => phases.has(phase));
}

export function validateAutomaticPlan(args: {
  payload: Record<string, unknown>;
  finalPlan: NormalizedAutomaticPlan;
}): AutomaticValidationResult {
  const { payload, finalPlan } = args;
  const issues: AutomaticValidationIssue[] = [];
  const repairPhases = new Set<AutomaticRepairPhase>();
  const completedCourses = collectCompletedTranscriptCourses(payload);
  const plannedCourses = collectPlannedCourseCodes(finalPlan);
  const allPlannedOccurrences = new Map<string, number>();

  for (const term of finalPlan.plan) {
    for (const rawCourse of term.courses) {
      const code = normalizeCourseCode(rawCourse.code);
      if (!code || isHistoricalCourse(rawCourse)) continue;
      allPlannedOccurrences.set(code, (allPlannedOccurrences.get(code) || 0) + 1);
      if (completedCourses.has(code) && !isRetakeCourse(rawCourse)) {
        issues.push({
          code: 'completed_course_replanned',
          message: `Completed course ${code} was scheduled again in ${term.term}.`,
          phaseHint: 'major_fill',
          details: { term: term.term, courseCode: code },
        });
        repairPhases.add('major_fill');
      }
    }
  }

  for (const [code, count] of allPlannedOccurrences.entries()) {
    if (count <= 1) continue;
    issues.push({
      code: 'duplicate_course',
      message: `Course ${code} appears ${count} times in planned terms.`,
      phaseHint: 'elective_fill',
      details: { courseCode: code, count },
    });
    repairPhases.add('elective_fill');
  }

  const requirements = collectRequirementDescriptors(payload);
  for (const requirement of requirements) {
    const missingCodes = Array.from(requirement.courseCodes).filter(
      code => !completedCourses.has(code) && !plannedCourses.has(code)
    );
    if (missingCodes.length === 0) continue;
    issues.push({
      code: 'missing_requirement',
      message: `Requirement ${requirement.requirementId} is not satisfied by completed or planned courses.`,
      phaseHint: requirement.phaseHint,
      details: {
        requirementId: requirement.requirementId,
        missingCourseCodes: missingCodes,
        candidateCourseCodes: Array.from(requirement.courseCodes),
      },
    });
    repairPhases.add(requirement.phaseHint);
  }

  const envelopes = buildCreditEnvelopeMap(payload);
  if (envelopes.size > 0) {
    for (const term of finalPlan.plan) {
      const directKey = term.term.trim().toLowerCase();
      const envelope = envelopes.get(directKey);
      if (!envelope) continue;
      const totalCredits = term.courses.reduce((sum, course) => sum + parseCredits(course.credits), 0);
      if (totalCredits < envelope.minCredits || totalCredits > envelope.maxCredits) {
        issues.push({
          code: 'credit_envelope_violation',
          message: `${term.term} has ${totalCredits} credits (expected ${envelope.minCredits}-${envelope.maxCredits}).`,
          phaseHint: 'elective_fill',
          details: {
            term: term.term,
            totalCredits,
            minCredits: envelope.minCredits,
            maxCredits: envelope.maxCredits,
          },
        });
        repairPhases.add('elective_fill');
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestedRepairPhases: sortRepairPhases(repairPhases),
  };
}
