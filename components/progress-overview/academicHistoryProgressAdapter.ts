/**
 * Data adapter to convert academic-history data into Progress Overview component data structures.
 * Reuses existing calculateProgramProgress logic from the academic-history page.
 */

import { type ParsedCourse, type CourseFulfillment } from '@/lib/services/userCoursesService';
import type { ProgramRow } from '@/types/program';
import type { ProgressCategory, Requirement, OverallProgress, Course, RequirementStatus, CourseStatus } from './types';

interface GradPlan {
  id: string;
  student_id: number;
  programs_in_plan: number[];
  plan_details: unknown;
  is_active: boolean;
  created_at: string;
}

interface RequirementOption {
  programId: string;
  requirementId: string;
  requirementDescription: string;
}

/**
 * Maps a parsed course to a Progress Overview Course format.
 * Determines status based on whether the course has a grade.
 */
function mapCourseToProgressCourse(course: ParsedCourse): Course {
  // Determine status: if it has a grade, it's completed; otherwise it's completed if it's in the past, else planned
  let status: CourseStatus = 'completed';
  if (!course.grade || course.grade === '' || course.grade === 'IP' || course.grade === 'In Progress') {
    status = 'in-progress';
  }

  const termLabel = course.term ? course.term : undefined;

  return {
    id: course.id || `${course.subject}-${course.number}-${course.term}`,
    code: `${course.subject} ${course.number}`,
    title: course.title,
    credits: course.credits || 0,
    status,
    term: termLabel,
  };
}

/**
 * Calculates program progress metrics using the same logic as the academic-history page.
 * Analyzes course fulfillments to determine completion percentage and requirements met.
 */
function calculateProgramProgress(
  programId: string,
  userCourses: ParsedCourse[],
  requirementOptions: RequirementOption[],
  program: ProgramRow,
): {
  fulfilled: number;
  total: number;
  percentage: number;
  completedCredits: number;
  requiredCredits: number;
  completedCourses: number;
  inProgressCourses: number;
} {
  // Get all requirements for this program
  const programRequirements = requirementOptions.filter((option) => option.programId === programId);
  const totalRequirements = programRequirements.length;

  if (totalRequirements === 0) {
    return {
      fulfilled: 0,
      total: 0,
      percentage: 0,
      completedCredits: 0,
      requiredCredits: 0,
      completedCourses: 0,
      inProgressCourses: 0,
    };
  }

  // Parse the requirements structure
  interface RequirementStructure {
    programRequirements?: Array<{
      requirementId: number | string;
      type: string;
      constraints?: {
        n?: number;
        minTotalCredits?: number;
      };
    }>;
  }

  let requirementsStructure: RequirementStructure | null = null;

  try {
    if (typeof program.requirements === 'string') {
      requirementsStructure = JSON.parse(program.requirements) as RequirementStructure;
    } else if (program.requirements && typeof program.requirements === 'object') {
      requirementsStructure = program.requirements as RequirementStructure;
    }
  } catch (error) {
    // Log but don't throw - we'll fall back to simple counting
    console.error('Failed to parse program requirements:', error);
  }

  if (!requirementsStructure?.programRequirements) {
    // Fallback to simple counting if we can't parse requirements
    const fulfilledRequirementIds = new Set<string>();
    userCourses.forEach((course) => {
      course.fulfillsRequirements?.forEach((fulfillment) => {
        if (fulfillment.programId === programId) {
          fulfilledRequirementIds.add(fulfillment.requirementId);
        }
      });
    });

    const fulfilled = fulfilledRequirementIds.size;
    const percentage = (fulfilled / totalRequirements) * 100;
    const completedCourses = userCourses.filter((c) => c.grade && c.grade !== 'IP').length;
    const inProgressCourses = userCourses.filter((c) => c.grade === 'IP' || c.grade === 'In Progress').length;

    return {
      fulfilled,
      total: totalRequirements,
      percentage,
      completedCredits: 0,
      requiredCredits: 0,
      completedCourses,
      inProgressCourses,
    };
  }

  // Calculate progress for each requirement based on its type
  let totalProgress = 0;
  let totalWeight = 0;

  requirementsStructure.programRequirements.forEach((requirement) => {
    const reqId = String(requirement.requirementId);
    const reqType = requirement.type;

    // Get courses that fulfill this requirement
    const fulfillingCourses = userCourses.filter((course) =>
      course.fulfillsRequirements?.some(
        (fulfillment) =>
          fulfillment.programId === programId && fulfillment.requirementId.startsWith(reqId),
      ),
    );

    let requirementProgress = 0;
    let requirementWeight = 1;

    if (reqType === 'chooseNOf' && requirement.constraints?.n) {
      // Progress = courses fulfilled / N required
      const n = requirement.constraints.n;
      requirementProgress = Math.min(fulfillingCourses.length / n, 1);
      requirementWeight = n; // Weight by number of courses required
    } else if (reqType === 'creditBucket' && requirement.constraints?.minTotalCredits) {
      // Progress = credits earned / credits required
      const creditsEarned = fulfillingCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
      const creditsRequired = requirement.constraints.minTotalCredits;
      requirementProgress = Math.min(creditsEarned / creditsRequired, 1);
      requirementWeight = creditsRequired; // Weight by credit hours required
    } else if (reqType === 'allOf') {
      // Progress = 1 if any courses fulfill it, 0 otherwise
      requirementProgress = fulfillingCourses.length > 0 ? 1 : 0;
      requirementWeight = 1;
    } else {
      // Default: binary fulfilled/not fulfilled
      requirementProgress = fulfillingCourses.length > 0 ? 1 : 0;
      requirementWeight = 1;
    }

    totalProgress += requirementProgress * requirementWeight;
    totalWeight += requirementWeight;
  });

  const percentage = totalWeight > 0 ? (totalProgress / totalWeight) * 100 : 0;

  // Calculate total completed/required for display
  const completedCount = Math.round((totalProgress / totalWeight) * totalRequirements);
  const totalCount = totalRequirements;

  const completedCourses = userCourses.filter((c) => c.grade && c.grade !== 'IP').length;
  const inProgressCourses = userCourses.filter((c) => c.grade === 'IP' || c.grade === 'In Progress').length;

  return {
    fulfilled: completedCount,
    total: totalCount,
    percentage,
    completedCredits: 0,
    requiredCredits: 0,
    completedCourses,
    inProgressCourses,
  };
}

/**
 * Converts academic-history data into a ProgressCategory array for the Progress Overview component.
 * Groups programs by their type (Major, Minor, Gen Ed, etc.) and calculates progress for each.
 */
export function convertToProgressCategories(
  userCourses: ParsedCourse[],
  programs: ProgramRow[],
  requirementOptions: RequirementOption[],
  activeGradPlan: GradPlan | null,
): ProgressCategory[] {
  if (!programs || programs.length === 0) {
    return [];
  }

  const categories: ProgressCategory[] = [];

  // Map of category names to their metadata
  const categoryMetadata: Record<
    string,
    { color: string; displayName: string; order: number }
  > = {
    major: { color: 'var(--primary)', displayName: 'Major', order: 1 },
    minor: { color: '#02174C', displayName: 'Minor', order: 2 },
    'general education': { color: '#FF3508', displayName: 'General Education', order: 3 },
    religion: { color: '#9C27B0', displayName: 'Religion', order: 4 },
    electives: { color: '#AC11FA', displayName: 'Electives', order: 5 },
    'general ed': { color: '#FF3508', displayName: 'General Education', order: 3 },
  };

  // Group programs by type
  const programsByType: Record<string, ProgramRow[]> = {};

  programs.forEach((program) => {
    const type = (program.program_type || 'major').toLowerCase();
    if (!programsByType[type]) {
      programsByType[type] = [];
    }
    programsByType[type].push(program);
  });

  // Create categories from grouped programs
  Object.entries(programsByType).forEach(([type, typePrograms]) => {
    const metadata = categoryMetadata[type] || {
      color: 'var(--primary)',
      displayName: type.charAt(0).toUpperCase() + type.slice(1),
      order: 100,
    };

    typePrograms.forEach((program, index) => {
      const progress = calculateProgramProgress(program.id, userCourses, requirementOptions, program);

      // Calculate credits breakdown
      const programCourses = userCourses.filter((c) =>
        c.fulfillsRequirements?.some((f) => f.programId === program.id),
      );

      const completedCredits = programCourses
        .filter((c) => c.grade && c.grade !== 'IP')
        .reduce((sum, c) => sum + (c.credits || 0), 0);

      const inProgressCredits = programCourses
        .filter((c) => c.grade === 'IP' || c.grade === 'In Progress')
        .reduce((sum, c) => sum + (c.credits || 0), 0);

      const totalCredits = programCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
      const remaining = Math.max(0, totalCredits - completedCredits - inProgressCredits);
      const planned = 0; // We don't track "planned" courses in academic-history

      // Create requirements array from the requirements structure
      const requirements: Requirement[] = [];

      try {
        const parsed =
          typeof program.requirements === 'string'
            ? JSON.parse(program.requirements)
            : program.requirements;

        if (parsed?.programRequirements && Array.isArray(parsed.programRequirements)) {
          parsed.programRequirements.forEach((req: any, idx: number) => {
            const reqId = String(req.requirementId || idx);
            const reqDescription = requirementOptions.find(
              (o) => o.programId === program.id && o.requirementId === reqId,
            )?.requirementDescription || `Requirement ${idx + 1}`;

            // Get courses for this requirement
            const reqCourses = userCourses.filter((c) =>
              c.fulfillsRequirements?.some(
                (f) =>
                  f.programId === program.id && f.requirementId.startsWith(reqId),
              ),
            );

            const reqCompleted = reqCourses.filter((c) => c.grade && c.grade !== 'IP').length;
            const reqInProgress = reqCourses.filter((c) => c.grade === 'IP' || c.grade === 'In Progress').length;

            const status: RequirementStatus =
              reqCompleted > 0 ? 'completed' : reqInProgress > 0 ? 'in-progress' : 'not-started';

            requirements.push({
              id: idx,
              title: reqDescription,
              description: reqDescription,
              progress: reqCompleted,
              total: Math.max(1, req.constraints?.n || 1),
              status,
              completed: reqCompleted,
              inProgress: reqInProgress,
              planned: 0,
              remaining: Math.max(0, (req.constraints?.n || 1) - reqCompleted),
              courses: reqCourses.map(mapCourseToProgressCourse),
            });
          });
        }
      } catch (error) {
        // Fallback: create a simple requirement for all courses
        const courses = userCourses.filter((c) =>
          c.fulfillsRequirements?.some((f) => f.programId === program.id),
        );

        if (courses.length > 0) {
          requirements.push({
            id: 0,
            title: 'All Requirements',
            description: 'All degree requirements',
            progress: progress.fulfilled,
            total: progress.total || courses.length,
            status: progress.percentage >= 100 ? 'completed' : progress.percentage > 0 ? 'in-progress' : 'not-started',
            completed: progress.completedCourses,
            inProgress: progress.inProgressCourses,
            planned: 0,
            remaining: Math.max(0, (progress.total || courses.length) - progress.fulfilled),
            courses: courses.map(mapCourseToProgressCourse),
          });
        }
      }

      const nameLabel =
        typePrograms.length > 1 ? `${metadata.displayName} ${index + 1}` : metadata.displayName;

      categories.push({
        name: program.name || nameLabel,
        color: metadata.color,
        totalCredits,
        percentComplete: Math.round(progress.percentage),
        completed: completedCredits,
        inProgress: inProgressCredits,
        planned,
        remaining,
        requirements,
        tabLabel:
          typePrograms.length > 1
            ? `${metadata.displayName.slice(0, 1)}${index + 1}`
            : metadata.displayName.slice(0, 3).toUpperCase(),
      });
    });
  });

  // Sort categories by defined order
  categories.sort((a, b) => {
    const orderA = categoryMetadata[a.name.toLowerCase()]?.order ?? 100;
    const orderB = categoryMetadata[b.name.toLowerCase()]?.order ?? 100;
    return orderA - orderB;
  });

  return categories;
}

/**
 * Calculates overall degree progress from all user courses and programs.
 */
export function calculateOverallProgress(
  userCourses: ParsedCourse[],
  programs: ProgramRow[],
): OverallProgress {
  const completedCourses = userCourses.filter((c) => c.grade && c.grade !== 'IP').length;
  const inProgressCourses = userCourses.filter((c) => c.grade === 'IP' || c.grade === 'In Progress').length;
  const totalCourses = userCourses.length;

  const completedCredits = userCourses
    .filter((c) => c.grade && c.grade !== 'IP')
    .reduce((sum, c) => sum + (c.credits || 0), 0);

  const inProgressCredits = userCourses
    .filter((c) => c.grade === 'IP' || c.grade === 'In Progress')
    .reduce((sum, c) => sum + (c.credits || 0), 0);

  const totalCredits = userCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

  // Assume total degree is 120 credits (common for Bachelor's degrees)
  // This can be made dynamic based on program requirements if needed
  const degreeTotalCredits = Math.max(120, totalCredits);
  const percentComplete = degreeTotalCredits > 0 ? (completedCredits / degreeTotalCredits) * 100 : 0;
  const remainingCredits = Math.max(0, degreeTotalCredits - completedCredits - inProgressCredits);

  return {
    percentComplete: Math.round(percentComplete),
    totalCredits: degreeTotalCredits,
    completedCredits,
    inProgressCredits,
    plannedCredits: 0,
    remainingCredits,
    totalCourses,
    completedCourses,
  };
}
