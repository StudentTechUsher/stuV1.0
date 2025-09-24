import type { ProgramRow } from '@/types/program';

// === Shared Types for Requirements Processing ===
export type Credits =
  | { fixed: number }
  | { variable: true; min?: number; max?: number }
  | null;

export interface CourseBlock {
  type: 'course';
  code: string;
  title: string;
  credits: Credits;
  prerequisite?: string;
  status?: 'active' | 'retired';
}

export interface ContainerBlock {
  type: 'option' | 'requirement';
  label?: string;
  title?: string;
  rule?: { type: string; min_count?: number; of_count?: number; unit?: string };
  blocks?: Block[];
}

export type Block = CourseBlock | ContainerBlock;

export interface RichRequirement {
  subtitle: string;
  requirement?: {
    index?: number;
    rule?: { type: string; min_count?: number; of_count?: number; unit?: string };
  };
  blocks?: Block[];
}

export interface ProgramCourse {
  code: string;
  title: string;
  credits: number;
}

export interface SubRequirement {
  courses: ProgramCourse[];
  description: string;
  requirementId: string | number;
}

export interface ProgramRequirement {
  notes?: string;
  description: string;
  requirementId: number;
  subRequirements?: SubRequirement[];
  courses?: ProgramCourse[];
  otherRequirement?: string;
  steps?: string[];
}

// === Parsing Helpers ===

export function parseRequirementsFromGenEd(genEdData: ProgramRow[]): RichRequirement[] {
  if (!genEdData || !Array.isArray(genEdData) || genEdData.length === 0) {
    return [];
  }
  const all: RichRequirement[] = [];

  genEdData.forEach((program, index) => {
    if (!program || !program.requirements) return;
    try {
      const req = typeof program.requirements === 'string'
        ? JSON.parse(program.requirements)
        : program.requirements;
      if (Array.isArray(req)) {
        const filtered = req.filter((r: unknown): r is RichRequirement => (
          typeof r === 'object' && r !== null && 'subtitle' in r &&
          typeof (r as { subtitle?: unknown }).subtitle === 'string'
        ));
        all.push(...filtered);
      }
    } catch (e) {
      console.error('Error parsing requirements for program', index, ':', e);
    }
  });

  return all;
}

export function parseProgramRequirements(programsData: ProgramRow[], selectedProgramIds: Set<string>): ProgramRequirement[] {
  if (!programsData || !Array.isArray(programsData) || programsData.length === 0 || selectedProgramIds.size === 0) {
    return [];
  }
  const all: ProgramRequirement[] = [];

  programsData.forEach(program => {
    if (!program || !selectedProgramIds.has(program.id)) return;
    if (!program.requirements) return;
    try {
      const req = typeof program.requirements === 'string'
        ? JSON.parse(program.requirements)
        : program.requirements;
      if (Array.isArray(req?.programRequirements)) {
        all.push(...req.programRequirements);
      }
    } catch (e) {
      console.error(`❌ Error parsing program requirements for ${program.name}:`, e);
    }
  });

  return all;
}

// === Requirement / Course Utilities ===

export function getProgramDropdownCount(req: ProgramRequirement | SubRequirement): number {
  const description = req.description || '';

  // Credit-based requirements e.g. "Complete 33 credits"
  const creditMatch = /Complete (\d+) credits?/i.exec(description);
  if (creditMatch) {
    const totalCredits = parseInt(creditMatch[1], 10);
    const courses = 'courses' in req ? (req.courses || []) : [];
    if (courses.length > 0) {
      const avgCredits = courses.reduce((sum, course) => sum + (course.credits || 3), 0) / courses.length;
      return Math.ceil(totalCredits / avgCredits);
    }
    return Math.ceil(totalCredits / 3); // fallback assume 3 credits
  }

  // Course-count requirements e.g. "Complete 2 Courses"
  const courseMatch = /Complete (\d+)(?:\s+(?:of\s+\d+\s+)?(?:courses?|classes?))?/i.exec(description);
  if (courseMatch) {
    return parseInt(courseMatch[1], 10);
  }

  return 1;
}

export function collectCourses(blocks?: Block[]): CourseBlock[] {
  if (!blocks) return [];
  const out: CourseBlock[] = [];
  for (const b of blocks) {
    if (!b) continue;
    if (b.type === 'course') {
      out.push(b);
    } else if ((b.type === 'option' || b.type === 'requirement') && b.blocks) {
      out.push(...collectCourses(b.blocks));
    }
  }
  return out;
}

export function creditText(credits: Credits): string {
  if (!credits) return 'credits n/a';
  if ('fixed' in credits) return `${credits.fixed} credits`;
  if ('variable' in credits) {
    const min = credits.min ?? '';
    const max = credits.max ?? '';
    if (min && max && min === max) return `${min} credits`;
    if (min && max) return `${min}-${max} credits`;
    if (min) return `${min}+ credits`;
    if (max) return `≤${max} credits`;
    return 'variable credits';
  }
  return 'credits n/a';
}

export function getRequirementKey(programId: string, req: ProgramRequirement | SubRequirement, isSubReq = false) {
  const prefix = isSubReq ? 'subreq' : 'req';
  return `${programId}-${prefix}-${req.requirementId}`;
}

export function shouldAutoSelect(requirement: ProgramRequirement | SubRequirement, isSubRequirement: boolean): boolean {
  if (isSubRequirement) return false; // never auto-select sub requirements
  if (!requirement.courses || requirement.courses.length === 0) return false;
  const dropdownCount = getProgramDropdownCount(requirement);
  const validCourses = requirement.courses.filter(c => c.credits != null);
  return validCourses.length > 0 && validCourses.length === dropdownCount;
}

export function getValidCourses(requirement: ProgramRequirement | SubRequirement) {
  return (requirement.courses || []).filter(course => course.credits != null);
}

export function getDropdownCount(req: RichRequirement): number {
  const min = req?.requirement?.rule?.min_count && Number.isFinite(req.requirement.rule.min_count)
    ? (req.requirement.rule.min_count as number)
    : 1;
  return Math.max(1, min);
}

export function getFlattenedRequirements(
  programRequirements: ProgramRequirement[],
  programId: string,
  makeKey: (programId: string, req: ProgramRequirement | SubRequirement, isSubReq?: boolean) => string
) {
  const flattened: Array<{
    requirement: ProgramRequirement | SubRequirement;
    isSubRequirement: boolean;
    key: string;
    parentRequirementId?: string | number;
  }> = [];

  programRequirements.forEach(req => {
    flattened.push({ requirement: req, isSubRequirement: false, key: makeKey(programId, req) });
    if (req.subRequirements && Array.isArray(req.subRequirements)) {
      req.subRequirements.forEach(subReq => {
        flattened.push({
          requirement: subReq,
          isSubRequirement: true,
            key: makeKey(programId, subReq, true),
          parentRequirementId: req.requirementId
        });
      });
    }
  });

  return flattened;
}
