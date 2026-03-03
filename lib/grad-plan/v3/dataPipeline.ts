import type {
  AgentContextSnapshot,
  ProgramDescriptor,
  RequirementBucket,
  SelectedCourseItem,
} from '@/lib/chatbot/grad-plan/v3/types';

export type PipelineProgramRow = {
  id: number | string;
  name: string;
  program_type?: string | null;
  is_general_ed?: boolean | null;
  requirements?: unknown;
  minimum_credits?: number | null;
  target_total_credits?: number | null;
};

export type PipelineTranscriptCourse = {
  code: string;
  title: string;
  credits: number;
  term: string;
  grade: string;
  status: string;
  source: string;
  fulfills: string[];
};

export type PipelineRequirementEntry = {
  requirementId: string;
  requirementLabel: string;
  selectedCourses: SelectedCourseItem[];
};

export type PipelineProgramRequirements = {
  descriptor: ProgramDescriptor;
  requirements: PipelineRequirementEntry[];
};

function normalizeProgramType(rawType: unknown, isGeneralEd: boolean): ProgramDescriptor['programType'] {
  if (isGeneralEd) return 'general_education';
  if (typeof rawType !== 'string') return 'major';
  const lowered = rawType.toLowerCase();
  if (lowered === 'minor') return 'minor';
  if (lowered === 'honors' || lowered === 'honor') return 'honors';
  if (lowered === 'graduate' || lowered === 'graduate_no_gen_ed') return 'graduate';
  return 'major';
}

function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCredits(value: unknown, fallback = 3): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toCourseItem(raw: Record<string, unknown>, source: SelectedCourseItem['source']): SelectedCourseItem | null {
  const code = normalizeCode(raw.code ?? raw.courseCode ?? raw.course_code);
  if (!code) return null;
  const title = typeof raw.title === 'string'
    ? raw.title
    : typeof raw.courseTitle === 'string'
    ? raw.courseTitle
    : code;

  return {
    courseCode: code,
    courseTitle: title,
    credits: normalizeCredits(raw.credits ?? raw.creditHours ?? raw.credit_hours),
    source,
    requirementBucketKey: null,
  };
}

function collectCoursesFromUnknown(
  node: unknown,
  source: SelectedCourseItem['source'],
  out: SelectedCourseItem[]
) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const child of node) {
      collectCoursesFromUnknown(child, source, out);
    }
    return;
  }

  if (typeof node !== 'object') return;

  const raw = node as Record<string, unknown>;
  const asCourse = toCourseItem(raw, source);
  if (asCourse) {
    out.push(asCourse);
  }

  for (const value of Object.values(raw)) {
    if (value && typeof value === 'object') {
      collectCoursesFromUnknown(value, source, out);
    }
  }
}

function dedupeCourses(courses: SelectedCourseItem[]): SelectedCourseItem[] {
  const seen = new Set<string>();
  const deduped: SelectedCourseItem[] = [];
  for (const course of courses) {
    if (seen.has(course.courseCode)) continue;
    seen.add(course.courseCode);
    deduped.push(course);
  }
  return deduped;
}

function programSourceType(programType: ProgramDescriptor['programType']): SelectedCourseItem['source'] {
  if (programType === 'minor') return 'minor';
  if (programType === 'general_education') return 'gen_ed';
  return 'major';
}

export function normalizeProgramsForV3(programRows: PipelineProgramRow[]): ProgramDescriptor[] {
  return programRows
    .map((row) => {
      const numericId = typeof row.id === 'number'
        ? row.id
        : Number.parseInt(String(row.id), 10);
      if (!Number.isFinite(numericId)) return null;
      return {
        programId: numericId,
        programName: row.name,
        programType: normalizeProgramType(row.program_type, Boolean(row.is_general_ed)),
      } satisfies ProgramDescriptor;
    })
    .filter((row): row is ProgramDescriptor => Boolean(row));
}

function parseRequirementEntries(args: {
  program: PipelineProgramRow;
  descriptor: ProgramDescriptor;
}): PipelineRequirementEntry[] {
  const { program, descriptor } = args;
  const source = programSourceType(descriptor.programType);
  const rawRequirements = program.requirements;

  if (!rawRequirements) {
    return [];
  }

  const entries: PipelineRequirementEntry[] = [];

  const addEntryFromNode = (node: unknown, fallbackLabel: string, fallbackId: string) => {
    const courses: SelectedCourseItem[] = [];
    collectCoursesFromUnknown(node, source, courses);
    const deduped = dedupeCourses(courses);
    if (deduped.length === 0) return;

    entries.push({
      requirementId: fallbackId,
      requirementLabel: fallbackLabel,
      selectedCourses: deduped,
    });
  };

  if (Array.isArray(rawRequirements)) {
    rawRequirements.forEach((req, index) => {
      if (!req || typeof req !== 'object') return;
      const cast = req as Record<string, unknown>;
      const label = typeof cast.subtitle === 'string'
        ? cast.subtitle
        : typeof cast.title === 'string'
        ? cast.title
        : `Requirement ${index + 1}`;
      const requirementId = typeof cast.requirementId === 'string'
        ? cast.requirementId
        : `requirement-${index + 1}`;
      addEntryFromNode(cast, label, requirementId);
    });
  } else if (typeof rawRequirements === 'object') {
    const cast = rawRequirements as Record<string, unknown>;

    const maybeProgramRequirements = Array.isArray(cast.programRequirements)
      ? cast.programRequirements
      : [];

    if (maybeProgramRequirements.length > 0) {
      maybeProgramRequirements.forEach((req, index) => {
        if (!req || typeof req !== 'object') return;
        const reqCast = req as Record<string, unknown>;
        const label = typeof reqCast.description === 'string'
          ? reqCast.description
          : `Requirement ${index + 1}`;
        const requirementId = typeof reqCast.requirementId === 'string'
          ? reqCast.requirementId
          : `requirement-${index + 1}`;
        addEntryFromNode(reqCast, label, requirementId);
      });
    } else {
      addEntryFromNode(cast, 'Core Requirements', 'requirement-1');
    }
  }

  if (entries.length === 0) {
    const fallback: SelectedCourseItem[] = [];
    collectCoursesFromUnknown(rawRequirements, source, fallback);
    const deduped = dedupeCourses(fallback);
    if (deduped.length > 0) {
      entries.push({
        requirementId: 'requirement-1',
        requirementLabel: 'Core Requirements',
        selectedCourses: deduped,
      });
    }
  }

  return entries.map((entry) => ({
    ...entry,
    selectedCourses: entry.selectedCourses.map((course) => ({
      ...course,
      requirementBucketKey: `${descriptor.programName}:${entry.requirementId}`,
    })),
  }));
}

export function normalizeTranscriptCourses(rawCourses: unknown[]): {
  transcriptCourses: PipelineTranscriptCourse[];
  completedCourseCodes: string[];
} {
  const transcriptCourses: PipelineTranscriptCourse[] = [];
  const completedCourseCodes: string[] = [];

  for (const raw of rawCourses) {
    if (!raw || typeof raw !== 'object') continue;
    const cast = raw as Record<string, unknown>;
    const code = normalizeCode(cast.code ?? cast.courseCode ?? cast.subject);
    if (!code) continue;
    const status = typeof cast.status === 'string' ? cast.status : 'Completed';
    const grade = typeof cast.grade === 'string' ? cast.grade : 'Completed';

    transcriptCourses.push({
      code,
      title: typeof cast.title === 'string' ? cast.title : code,
      credits: normalizeCredits(cast.credits),
      term: typeof cast.term === 'string' ? cast.term : 'Unknown',
      grade,
      status,
      source: typeof cast.source === 'string' ? cast.source : 'Institutional',
      fulfills: Array.isArray(cast.fulfills)
        ? cast.fulfills.filter((value): value is string => typeof value === 'string')
        : [],
    });

    const normalizedStatus = status.toLowerCase();
    const normalizedGrade = grade.toUpperCase();
    const passing = !['F', 'E', 'W', 'I'].includes(normalizedGrade);
    if (normalizedStatus.includes('completed') && passing) {
      completedCourseCodes.push(code);
    }
  }

  return {
    transcriptCourses,
    completedCourseCodes: Array.from(new Set(completedCourseCodes)),
  };
}

export function buildProgramRequirements(
  selectedPrograms: ProgramDescriptor[],
  programRows: PipelineProgramRow[]
): PipelineProgramRequirements[] {
  const rowsById = new Map<number, PipelineProgramRow>();
  for (const row of programRows) {
    const numericId = typeof row.id === 'number'
      ? row.id
      : Number.parseInt(String(row.id), 10);
    if (Number.isFinite(numericId)) {
      rowsById.set(numericId, row);
    }
  }

  return selectedPrograms
    .map((descriptor) => {
      const row = rowsById.get(descriptor.programId);
      if (!row) return null;
      return {
        descriptor,
        requirements: parseRequirementEntries({
          program: row,
          descriptor,
        }),
      } satisfies PipelineProgramRequirements;
    })
    .filter((value): value is PipelineProgramRequirements => Boolean(value));
}

function summarizeRequirementCredits(courses: SelectedCourseItem[]): number {
  return courses.reduce((sum, course) => sum + normalizeCredits(course.credits), 0);
}

export function buildRequirementBuckets(args: {
  programRequirements: PipelineProgramRequirements[];
  completedCourseCodes: string[];
}): RequirementBucket[] {
  const completed = new Set(args.completedCourseCodes.map((code) => code.toUpperCase()));
  const buckets: RequirementBucket[] = [];

  for (const program of args.programRequirements) {
    for (const requirement of program.requirements) {
      const uniqueCourses = dedupeCourses(requirement.selectedCourses);
      const requiredCredits = summarizeRequirementCredits(uniqueCourses);
      const completedCredits = uniqueCourses.reduce((sum, course) => {
        if (!completed.has(course.courseCode.toUpperCase())) return sum;
        return sum + normalizeCredits(course.credits);
      }, 0);

      const requirementType: RequirementBucket['requirementType'] =
        program.descriptor.programType === 'minor'
          ? 'minor'
          : program.descriptor.programType === 'general_education'
          ? 'gen_ed'
          : 'major';

      buckets.push({
        bucketKey: `${program.descriptor.programName}:${requirement.requirementId}`,
        bucketLabel: `${program.descriptor.programName} - ${requirement.requirementLabel}`,
        requirementType,
        requiredCredits,
        completedCredits,
        remainingCredits: Math.max(0, requiredCredits - completedCredits),
        candidateCourseCodes: uniqueCourses.map((course) => course.courseCode),
      });
    }
  }

  return buckets;
}

export function buildCandidateCourseSelection(args: {
  programRequirements: PipelineProgramRequirements[];
  completedCourseCodes: string[];
  requestedElectives: SelectedCourseItem[];
}): {
  selectedCourses: SelectedCourseItem[];
  requestedElectives: SelectedCourseItem[];
  remainingRequirementCredits: number;
  requestedElectiveCredits: number;
  totalCreditsToComplete: number;
  totalSelectedCredits: number;
} {
  const completed = new Set(args.completedCourseCodes.map((code) => code.toUpperCase()));
  const selectedCourses: SelectedCourseItem[] = [];

  for (const program of args.programRequirements) {
    for (const requirement of program.requirements) {
      for (const course of requirement.selectedCourses) {
        if (completed.has(course.courseCode.toUpperCase())) continue;
        selectedCourses.push(course);
      }
    }
  }

  const dedupedSelected = dedupeCourses(selectedCourses);
  const dedupedElectives = dedupeCourses(args.requestedElectives);

  const remainingRequirementCredits = dedupedSelected.reduce(
    (sum, course) => sum + normalizeCredits(course.credits),
    0
  );
  const requestedElectiveCredits = dedupedElectives.reduce(
    (sum, course) => sum + normalizeCredits(course.credits),
    0
  );

  return {
    selectedCourses: dedupedSelected,
    requestedElectives: dedupedElectives,
    remainingRequirementCredits,
    requestedElectiveCredits,
    totalCreditsToComplete: remainingRequirementCredits + requestedElectiveCredits,
    totalSelectedCredits: remainingRequirementCredits + requestedElectiveCredits,
  };
}

function nextTerm(term: string): string {
  const normalized = term.toLowerCase();
  if (normalized === 'fall') return 'spring';
  if (normalized === 'spring') return 'summer';
  if (normalized === 'summer') return 'fall';
  return 'spring';
}

export function buildSuggestedDistribution(args: {
  snapshot: AgentContextSnapshot;
  horizonTerms?: number;
}): Array<{
  term: string;
  year: number;
  termType: 'primary' | 'secondary';
  suggestedCredits: number;
  minCredits: number;
  maxCredits: number;
}> {
  const minCredits = args.snapshot.distribution.minCreditsPerTerm ?? 14;
  const maxCredits = args.snapshot.distribution.maxCreditsPerTerm ?? 17;
  const targetCredits = args.snapshot.distribution.targetCreditsPerTerm ?? Math.round((minCredits + maxCredits) / 2);
  const includeSecondary = args.snapshot.distribution.includeSecondaryTerms;

  const horizon = args.horizonTerms ?? 8;
  let term = args.snapshot.profile.estimatedGraduationTerm?.toLowerCase() ?? 'fall';
  let year = args.snapshot.profile.estimatedGraduationYear ?? new Date().getUTCFullYear();

  const rows: Array<{
    term: string;
    year: number;
    termType: 'primary' | 'secondary';
    suggestedCredits: number;
    minCredits: number;
    maxCredits: number;
  }> = [];

  for (let index = 0; index < horizon; index += 1) {
    const next = nextTerm(term);
    if (term === 'fall' && next === 'spring') {
      year += 1;
    }
    term = next;

    const isSecondary = term === 'summer';
    if (isSecondary && !includeSecondary) {
      continue;
    }

    rows.push({
      term: `${term.charAt(0).toUpperCase()}${term.slice(1)} ${year}`,
      year,
      termType: isSecondary ? 'secondary' : 'primary',
      suggestedCredits: targetCredits,
      minCredits: isSecondary ? Math.max(3, Math.round(minCredits / 2)) : minCredits,
      maxCredits: isSecondary ? Math.max(6, Math.round(maxCredits / 2)) : maxCredits,
    });
  }

  return rows;
}

export function buildV3AutomaticGenerationPayload(args: {
  snapshot: AgentContextSnapshot;
  selectedProgramRows: PipelineProgramRow[];
  transcriptCourses: PipelineTranscriptCourse[];
  queuedReplies?: string[];
}): Record<string, unknown> {
  const selectedPrograms = args.snapshot.programs.selected;
  const programRequirements = buildProgramRequirements(selectedPrograms, args.selectedProgramRows);
  const requirementBuckets = buildRequirementBuckets({
    programRequirements,
    completedCourseCodes: args.snapshot.transcript.completedCourseCodes,
  });

  const normalizedSelectedPrograms = selectedPrograms
    .filter((program) => program.programType !== 'general_education')
    .map((program) => {
      const matchingRequirements = programRequirements.find(
        (item) => item.descriptor.programId === program.programId
      );
      return {
        programId: String(program.programId),
        programName: program.programName,
        programType: program.programType,
        requirements: (matchingRequirements?.requirements ?? []).map((requirement) => ({
          requirementId: requirement.requirementId,
          requirementDescription: requirement.requirementLabel,
          selectedCourses: requirement.selectedCourses.map((course) => ({
            code: course.courseCode,
            title: course.courseTitle,
            credits: course.credits,
            fulfills: [requirement.requirementId],
          })),
        })),
      };
    });

  const generalEducationRequirements = programRequirements
    .filter((program) => program.descriptor.programType === 'general_education')
    .flatMap((program) =>
      program.requirements.map((requirement) => ({
        requirementId: requirement.requirementId,
        requirementDescription: requirement.requirementLabel,
        selectedCourses: requirement.selectedCourses.map((course) => ({
          code: course.courseCode,
          title: course.courseTitle,
          credits: course.credits,
          fulfills: [requirement.requirementId],
        })),
      }))
    );

  return {
    programs: normalizedSelectedPrograms,
    generalEducation: generalEducationRequirements,
    selectedCourses: args.snapshot.courses.selectedCourses.map((course) => ({
      code: course.courseCode,
      title: course.courseTitle,
      credits: course.credits,
      fulfills: course.requirementBucketKey ? [course.requirementBucketKey] : [],
    })),
    userAddedElectives: args.snapshot.courses.requestedElectives.map((course) => ({
      code: course.courseCode,
      title: course.courseTitle,
      credits: course.credits,
      fulfills: ['Elective'],
    })),
    takenCourses: args.transcriptCourses,
    selectedPrograms: selectedPrograms.map((program) => program.programId),
    hasTranscript: args.snapshot.transcript.hasTranscript,
    created_with_transcript: args.snapshot.transcript.hasTranscript,
    milestones: args.snapshot.constraints.milestones,
    workStatus: args.snapshot.constraints.workStatus,
    planStartTerm: args.snapshot.profile.estimatedGraduationTerm,
    planStartYear: args.snapshot.profile.estimatedGraduationYear,
    genEdDistribution: args.snapshot.distribution.strategy ?? 'balanced',
    suggestedDistribution: buildSuggestedDistribution({ snapshot: args.snapshot }),
    remainingCreditsToComplete: args.snapshot.courses.remainingRequirementCredits,
    requestedElectiveCredits: args.snapshot.courses.requestedElectiveCredits,
    totalCreditsToComplete: args.snapshot.courses.totalCreditsToComplete,
    requirementBuckets,
    userInstructions: args.queuedReplies ?? [],
  };
}
