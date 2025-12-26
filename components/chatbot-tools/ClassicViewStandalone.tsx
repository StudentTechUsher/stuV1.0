'use client';

import { useState } from 'react';
import type { ProgramOption } from '@/lib/chatbot/tools/programSelectionTool';
import type { CourseFlowData } from '@/lib/services/programService';

interface Course {
  code: string;
  title: string;
  credits: number;
  prerequisite?: string;
  terms?: string[];
}

interface ProgramRequirement {
  description: string;
  type: string;
  courses?: Course[];
  requirements?: ProgramRequirement[];
  options?: Array<{ requirements: ProgramRequirement[] }>;
  sequence?: Array<{ courses: Course[] }>;
  constraints?: { n?: number };
}

interface ProgramRequirementsStructure {
  programRequirements: ProgramRequirement[];
}

interface ClassicViewStandaloneProps {
  program: ProgramOption;
}

export default function ClassicViewStandalone({ program }: Readonly<ClassicViewStandaloneProps>) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);

  const courseFlow = program.course_flow as CourseFlowData | null;
  const requirementsData = program.requirements as ProgramRequirementsStructure | null;

  // Type guard functions
  const getCourses = (req: ProgramRequirement): Course[] | null => {
    if ('courses' in req && Array.isArray(req.courses)) {
      return req.courses;
    }
    return null;
  };

  const getSubRequirements = (req: ProgramRequirement): ProgramRequirement[] | null => {
    if ('requirements' in req && Array.isArray(req.requirements)) {
      return req.requirements;
    }
    return null;
  };

  // Helper function to get relationship insights for a course
  const getRelationshipInsights = (courseCode: string) => {
    if (!courseFlow || !courseFlow.courses || !courseFlow.connections) {
      return [];
    }

    const flowCourse = courseFlow.courses.find(c => c.courseCode === courseCode);
    if (!flowCourse) {
      return [];
    }

    const relatedConnections = courseFlow.connections.filter(
      conn => conn.fromCourseId === flowCourse.id || conn.toCourseId === flowCourse.id
    );

    const insights: Array<{ type: string; description: string; color: string }> = [];
    const processedNodes = new Set<string>();

    relatedConnections.forEach(conn => {
      const isFromCourse = conn.fromCourseId === flowCourse.id;
      const relatedCourseId = isFromCourse ? conn.toCourseId : conn.fromCourseId;

      // Handle connection to a node (Either-Or relationships)
      if (conn.toNodeId && courseFlow.connectionNodes) {
        if (conn.relationshipType !== 'either_or') {
          return;
        }

        if (processedNodes.has(conn.toNodeId)) return;
        processedNodes.add(conn.toNodeId);

        const node = courseFlow.connectionNodes.find(n => n.id === conn.toNodeId);
        if (!node) return;

        const coursesInNode = courseFlow.connections
          .filter(c => c.toNodeId === conn.toNodeId && c.relationshipType === 'either_or')
          .map(c => {
            const courseId = c.fromCourseId;
            return courseFlow.courses.find(course => course.id === courseId);
          })
          .filter(Boolean);

        if (coursesInNode.length > 0) {
          const allCourseCodes = coursesInNode.map(c => c!.courseCode);

          insights.push({
            type: 'Either-Or Choice',
            description: `Choose ${node.requiredCount} of ${coursesInNode.length}: ${allCourseCodes.join(', ')}`,
            color: '#059669'
          });
        }
        return;
      }

      // Handle connections to nodes with non-either_or relationships
      if (conn.toNodeId && conn.relationshipType !== 'either_or' && courseFlow.connectionNodes) {
        const node = courseFlow.connectionNodes.find(n => n.id === conn.toNodeId);
        if (!node) return;

        const coursesInNode = courseFlow.connections
          .filter(c => c.toNodeId === conn.toNodeId && c.relationshipType === 'either_or')
          .map(c => {
            const courseId = c.fromCourseId;
            return courseFlow.courses.find(course => course.id === courseId);
          })
          .filter(Boolean);

        if (coursesInNode.length > 0) {
          const groupCourseCodes = coursesInNode.map(c => c!.courseCode).join(', ');
          const relationshipType = conn.relationshipType || 'prerequisite';

          if (relationshipType === 'prerequisite') {
            if (isFromCourse) {
              insights.push({
                type: 'Prerequisite',
                description: `Required before taking any of: ${groupCourseCodes}`,
                color: '#2563eb'
              });
            } else {
              insights.push({
                type: 'Prerequisite',
                description: `Requires one of: ${groupCourseCodes}`,
                color: '#2563eb'
              });
            }
          }
        }
        return;
      }

      // Handle direct course-to-course connections
      if (!relatedCourseId) return;

      const relatedCourse = courseFlow.courses.find(c => c.id === relatedCourseId);
      if (!relatedCourse) return;

      const relationshipType = conn.relationshipType || 'prerequisite';

      switch (relationshipType) {
        case 'prerequisite':
          if (isFromCourse) {
            insights.push({
              type: 'Prerequisite',
              description: `${relatedCourse.courseCode} requires this course`,
              color: '#2563eb'
            });
          } else {
            insights.push({
              type: 'Prerequisite',
              description: `Requires ${relatedCourse.courseCode}`,
              color: '#2563eb'
            });
          }
          break;
        case 'optional_prereq':
          if (isFromCourse) {
            insights.push({
              type: 'Optional Prerequisite',
              description: `Recommended before ${relatedCourse.courseCode}`,
              color: '#8b5cf6'
            });
          } else {
            insights.push({
              type: 'Optional Prerequisite',
              description: `${relatedCourse.courseCode} recommended before this`,
              color: '#8b5cf6'
            });
          }
          break;
        case 'corequisite':
          insights.push({
            type: 'Corequisite',
            description: `Must be taken with ${relatedCourse.courseCode}`,
            color: '#dc2626'
          });
          break;
        case 'concurrent':
          insights.push({
            type: 'Concurrent',
            description: `Recommended to take with ${relatedCourse.courseCode}`,
            color: '#f59e0b'
          });
          break;
        case 'do_not_take_together':
          insights.push({
            type: 'Do Not Take Together',
            description: `Not recommended in same term as ${relatedCourse.courseCode}`,
            color: '#dc2626'
          });
          break;
      }
    });

    return insights;
  };

  // Extract all courses from requirements recursively
  const extractAllCourses = (requirements: ProgramRequirement[]): Array<{ course: Course; isRequired: boolean; requirementDesc: string }> => {
    const result: Array<{ course: Course; isRequired: boolean; requirementDesc: string }> = [];

    const processRequirement = (req: ProgramRequirement) => {
      const courses = getCourses(req);
      const subReqs = getSubRequirements(req);

      let isRequired = false;
      if (req.type === 'allOf') {
        isRequired = true;
      } else if (req.type === 'chooseNOf' && req.constraints) {
        const totalCourses = courses?.length || 0;
        isRequired = req.constraints.n === totalCourses;
      }

      if (courses) {
        courses.forEach(course => {
          result.push({
            course,
            isRequired,
            requirementDesc: req.description
          });
        });
      }

      if (subReqs) {
        subReqs.forEach(subReq => processRequirement(subReq));
      }

      if (req.type === 'optionGroup' && 'options' in req) {
        req.options?.forEach(option => {
          option.requirements.forEach(optReq => processRequirement(optReq));
        });
      }

      if (req.type === 'sequence' && 'sequence' in req) {
        req.sequence?.forEach(seqBlock => {
          seqBlock.courses.forEach(course => {
            result.push({
              course,
              isRequired: true,
              requirementDesc: req.description
            });
          });
        });
      }
    };

    requirements.forEach(req => processRequirement(req));
    return result;
  };

  const allCourses = requirementsData?.programRequirements
    ? extractAllCourses(requirementsData.programRequirements)
    : [];

  // Group courses by requirement description
  const groupedByRequirement = allCourses.reduce((acc, item) => {
    const key = item.requirementDesc || 'Other Requirements';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Array<{ course: Course; isRequired: boolean; requirementDesc: string }>>);

  const requirementEntries = Object.entries(groupedByRequirement);

  // Color scheme based on program type
  const typeColors: Record<string, { bg: string; text: string }> = {
    major: {
      bg: 'bg-[#2196f3]',
      text: 'text-[#2196f3]',
    },
    minor: {
      bg: 'bg-[#5E35B1]',
      text: 'text-[#5E35B1]',
    },
    general_ed: {
      bg: 'bg-[#FF9800]',
      text: 'text-[#FF9800]',
    },
  };

  const programType = program.program_type?.toLowerCase() || 'major';
  const colors = typeColors[programType] || typeColors.major;

  return (
    <div className="space-y-6">
      {requirementEntries.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-4 h-16 w-16 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              No courses defined in program requirements
            </p>
          </div>
        </div>
      ) : (
        requirementEntries.map(([requirementDesc, coursesInReq], reqIndex) => (
          <div key={reqIndex} className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
            {/* Requirement Number Header */}
            <div className={`border-b-2 ${colors.bg} px-6 py-3`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                  <span className={`font-header-semi text-lg font-bold ${colors.text}`}>
                    {reqIndex + 1}
                  </span>
                </div>
                <span className={`font-header-semi text-xl font-bold ${colors.titleText}`}>
                  Requirement {reqIndex + 1}
                </span>
              </div>
            </div>

            {/* Requirement Description Header */}
            <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-header-semi text-lg font-semibold text-[var(--foreground)]">
                  {requirementDesc}
                </h3>
                <span className="rounded-full bg-[var(--background)] px-3 py-1 font-body-semi text-xs font-semibold text-[var(--muted-foreground)]">
                  {coursesInReq.length} {coursesInReq.length === 1 ? 'course' : 'courses'}
                </span>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {coursesInReq.map((item, courseIndex) => (
                  <ClassicCourseCard
                    key={`${item.course.code}-${courseIndex}`}
                    course={item.course}
                    isRequired={item.isRequired}
                    onClick={() => setSelectedCourseCode(item.course.code)}
                    isSelected={selectedCourseCode === item.course.code}
                    insights={getRelationshipInsights(item.course.code)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Classic Course Card Component
function ClassicCourseCard({
  course,
  isRequired,
  onClick,
  isSelected,
  insights
}: {
  course: Course;
  isRequired: boolean;
  onClick: () => void;
  isSelected: boolean;
  insights: Array<{ type: string; description: string; color: string }>;
}) {
  const cardStyles = isRequired
    ? {
        bg: 'bg-[#fee2e2]',
        border: 'border-[#ef4444]',
        titleText: 'text-[#991b1b]',
        bodyText: 'text-[#7f1d1d]',
        badge: 'bg-[#ef4444] text-primary-foreground',
        infoBg: 'bg-[#fecaca]',
        infoText: 'text-[#7f1d1d]'
      }
    : {
        bg: 'bg-[#d1fae5]',
        border: 'border-[#10b981]',
        titleText: 'text-[#065f46]',
        bodyText: 'text-[#064e3b]',
        badge: 'bg-[#10b981] text-primary-foreground',
        infoBg: 'bg-[#a7f3d0]',
        infoText: 'text-[#064e3b]'
      };

  return (
    <div
      onClick={onClick}
      className={`overflow-hidden rounded-lg border-2 ${cardStyles.border} ${cardStyles.bg} shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
      }`}
    >
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className={`font-header-semi text-base font-semibold ${cardStyles.titleText}`}>
            {course.code}
          </h4>
          <span className={`flex-shrink-0 rounded-full ${cardStyles.badge} px-2 py-0.5 font-mono text-xs font-semibold`}>
            {course.credits} cr
          </span>
        </div>

        <p className={`mb-3 font-body text-sm ${cardStyles.bodyText}`}>
          {course.title}
        </p>

        <div className="space-y-2">
          <div className={`rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs font-semibold ${cardStyles.infoText}`}>
            {isRequired ? '🔒 Required' : '✓ Elective'}
          </div>

          {course.prerequisite && (
            <div className={`rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs ${cardStyles.infoText}`}>
              <span className="font-semibold">Prereq:</span> {course.prerequisite}
            </div>
          )}

          {course.terms && course.terms.length > 0 && (
            <div className={`rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs ${cardStyles.infoText}`}>
              <span className="font-semibold">Offered:</span> {course.terms.join(', ')}
            </div>
          )}
        </div>

        {/* Relationship Insights */}
        {isSelected && insights.length > 0 && (
          <div className="mt-3 space-y-2 border-t-2 border-zinc-300 dark:border-zinc-600 pt-3">
            <p className="font-body-semi text-xs font-bold text-gray-700">Course Relationships:</p>
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-md border-l-4 bg-white p-2 shadow-sm"
                style={{ borderLeftColor: insight.color }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: insight.color }}
                  />
                  <div>
                    <p className="font-body-semi text-xs font-semibold" style={{ color: insight.color }}>
                      {insight.type}
                    </p>
                    <p className="font-body text-xs text-gray-600">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No relationships message */}
        {isSelected && insights.length === 0 && (
          <div className="mt-3 border-t-2 border-zinc-300 dark:border-zinc-600 pt-3">
            <p className="font-body text-xs italic text-gray-500">
              No relationships defined in course flow
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
