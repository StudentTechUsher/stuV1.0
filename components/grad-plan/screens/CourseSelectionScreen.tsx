'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import WizardFormLayout from '../WizardFormLayout';
import {
  CourseSelectionInput,
  ProgramCourseSelection,
} from '@/lib/chatbot/tools/courseSelectionTool';
import type { ProgramRow } from '@/types/program';
import CourseSearch from '@/components/grad-plan/CourseSearch';
import type { CourseOffering } from '@/lib/services/courseOfferingService';

interface CourseSelectionScreenProps {
  studentType: 'undergraduate' | 'honor' | 'graduate';
  universityId: number;
  selectedProgramIds: number[];
  genEdProgramIds?: number[];
  onSubmit: (data: CourseSelectionInput) => void;
  onBack: () => void;
  isLoading?: boolean;
}

interface RequirementWithCourses {
  programId: string;
  programName: string;
  requirementTitle: string;
  requirementKey: string;
  courses: Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
  }>;
  isRequired: boolean;
}

export default function CourseSelectionScreen({
  studentType,
  universityId,
  selectedProgramIds,
  genEdProgramIds = [],
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<CourseSelectionScreenProps>) {
  // Program data state
  const [programsData, setProgramsData] = useState<ProgramRow[]>([]);
  const [genEdData, setGenEdData] = useState<ProgramRow[]>([]);
  const [loadingProgramData, setLoadingProgramData] = useState(true);

  // Selected courses state
  const [selectedCourses, setSelectedCourses] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Quick selected courses from search
  const [quickSelectedCourses, setQuickSelectedCourses] = useState<Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
  }>>([]);

  const selectedPrograms = useMemo(
    () => new Set(selectedProgramIds.map(id => String(id))),
    [selectedProgramIds]
  );

  // Fetch program data
  useEffect(() => {
    async function fetchProgramData() {
      if (selectedProgramIds.length === 0 && genEdProgramIds.length === 0) {
        setLoadingProgramData(false);
        return;
      }

      setLoadingProgramData(true);

      try {
        // Fetch selected programs
        if (selectedProgramIds.length > 0) {
          const idsStr = selectedProgramIds.map(id => String(id)).join(',');
          const programsRes = await fetch(
            `/api/programs/batch?ids=${idsStr}&universityId=${universityId}`
          );
          if (programsRes.ok) {
            const programsJson = await programsRes.json();
            console.log('Fetched programs data:', programsJson);
            setProgramsData(programsJson);
          } else {
            console.error('Failed to fetch programs:', programsRes.status, await programsRes.text());
          }
        }

        // Fetch GenEd programs
        if (studentType !== 'graduate' && genEdProgramIds.length > 0) {
          const genEdIdsStr = genEdProgramIds.map(id => String(id)).join(',');
          const genEdRes = await fetch(
            `/api/programs/batch?ids=${genEdIdsStr}&universityId=${universityId}`
          );
          if (genEdRes.ok) {
            const genEdJson = await genEdRes.json();
            console.log('Fetched GenEd data:', genEdJson);
            setGenEdData(genEdJson);
          } else {
            console.error('Failed to fetch GenEd programs:', genEdRes.status, await genEdRes.text());
          }
        }
      } catch (error) {
        console.error('Error fetching program data:', error);
      } finally {
        setLoadingProgramData(false);
      }
    }

    fetchProgramData();
  }, [selectedProgramIds, genEdProgramIds, universityId, studentType]);

  // Group courses by requirement
  const groupedCourses = useMemo(() => {
    const groups: RequirementWithCourses[] = [];

    // Process main programs
    programsData.forEach(program => {
      if (!selectedPrograms.has(String(program.id))) return;

      if (program.requirements && Array.isArray(program.requirements)) {
        program.requirements.forEach((req: any) => {
          if (req.courses && Array.isArray(req.courses)) {
            groups.push({
              programId: String(program.id),
              programName: program.name || 'Unknown Program',
              requirementTitle: req.title || 'Courses',
              requirementKey: `${program.id}-${req.title}`,
              courses: req.courses.slice(0, 20),
              isRequired: true,
            });
          }
        });
      }
    });

    // Process GenEd programs
    genEdData.forEach(program => {
      if (program.requirements && Array.isArray(program.requirements)) {
        program.requirements.forEach((req: any) => {
          if (req.courses && Array.isArray(req.courses)) {
            groups.push({
              programId: String(program.id),
              programName: program.name || 'General Education',
              requirementTitle: req.title || 'Courses',
              requirementKey: `${program.id}-${req.title}`,
              courses: req.courses.slice(0, 20),
              isRequired: false,
            });
          }
        });
      }
    });

    return groups;
  }, [programsData, genEdData, selectedPrograms]);

  // Filter courses based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedCourses;

    return groupedCourses
      .map(group => ({
        ...group,
        courses: group.courses.filter(course =>
          course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.title.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      }))
      .filter(group => group.courses.length > 0);
  }, [groupedCourses, searchTerm]);

  // Handler for quick course selection from search
  const handleQuickCourseSelect = (course: CourseOffering) => {
    const courseData = {
      id: String(course.offering_id),
      code: course.course_code,
      title: course.title,
      credits: course.credits_decimal || 3.0,
    };

    // Check if already selected
    if (quickSelectedCourses.some(c => c.code === courseData.code)) {
      return; // Already selected
    }

    setQuickSelectedCourses(prev => [...prev, courseData]);
  };

  const handleRemoveQuickCourse = (id: string) => {
    setQuickSelectedCourses(prev => prev.filter(c => c.id !== id));
  };

  // Count stats
  const totalRequiredCourses = groupedCourses
    .filter(g => g.isRequired)
    .reduce((sum, g) => sum + g.courses.length, 0);

  const selectedCount = Object.values(selectedCourses).flat().length + quickSelectedCourses.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Transform selectedCourses to CourseSelectionInput format
    const programs: ProgramCourseSelection[] = Array.from(selectedPrograms).map(
      programId => ({
        programId: Number(programId),
        selectedCourseIds: selectedCourses[programId] || [],
      })
    ) as unknown as ProgramCourseSelection[];

    onSubmit({
      selectedCourses,
      programs,
      studentType,
      quickSelectedCourses, // Include courses selected via search
    } as unknown as CourseSelectionInput);
  };

  if (loadingProgramData) {
    return (
      <WizardFormLayout title="Loading courses..." subtitle="Fetching your program requirements...">
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </WizardFormLayout>
    );
  }

  return (
    <WizardFormLayout
      title="Select your courses"
      subtitle="Choose from courses required for your degree."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Course Search - Top */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Quick Course Search</h3>
            <p className="text-sm text-gray-600 mb-3">
              Search for any course by code (e.g., TMA 101, CS 235) or name (e.g., Intro to Film)
            </p>
          </div>
          <CourseSearch
            universityId={universityId}
            onSelect={handleQuickCourseSelect}
            placeholder="Search by course code or name..."
            size="medium"
            fullWidth
          />

          {/* Quick Selected Courses */}
          {quickSelectedCourses.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-green-900 mb-2">
                Selected from Search ({quickSelectedCourses.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {quickSelectedCourses.map(course => (
                  <div
                    key={course.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-green-300 rounded-md text-sm"
                  >
                    <span className="font-medium text-gray-900">{course.code}</span>
                    <span className="text-gray-600">—</span>
                    <span className="text-gray-700">{course.title}</span>
                    <span className="text-gray-500">({course.credits} cr)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuickCourse(course.id)}
                      className="ml-1 text-red-600 hover:text-red-800"
                      aria-label="Remove course"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter existing courses */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Or Browse by Program Requirements
          </h3>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Filter courses below by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Progress Summary */}
        {totalRequiredCourses > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Selected: {selectedCount}</span>
              {totalRequiredCourses > 0 && (
                <span> of {totalRequiredCourses} total courses</span>
              )}
            </p>
          </div>
        )}

        {/* Courses List */}
        <div className="space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>{searchTerm ? 'No courses found matching your search' : 'No courses to select'}</p>
            </div>
          ) : (
            filteredGroups.map(group => {
              const sectionKey = group.requirementKey;
              const isExpanded = expandedSections[sectionKey] ?? true; // Expand by default
              const sectionSelectedCount = selectedCourses[sectionKey]?.length || 0;

              return (
                <div
                  key={sectionKey}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections(prev => ({
                        ...prev,
                        [sectionKey]: !isExpanded,
                      }))
                    }
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <ChevronDown
                        size={18}
                        className={`text-gray-600 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                      />
                      <div className="text-left">
                        <p className="font-medium text-gray-900 text-sm">
                          {group.requirementTitle}
                        </p>
                        <p className="text-xs text-gray-600">
                          {group.programName}
                          {sectionSelectedCount > 0 && (
                            <span className="ml-2 font-semibold" style={{ color: 'var(--primary)' }}>
                              ({sectionSelectedCount} selected)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {group.courses.length} courses
                    </span>
                  </button>

                  {/* Section Content */}
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-2 max-h-96 overflow-y-auto border-t border-gray-200">
                      {group.courses.map(course => {
                        const isSelected = selectedCourses[sectionKey]?.includes(course.id);
                        return (
                          <label
                            key={course.id}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || false}
                              onChange={(e) => {
                                setSelectedCourses(prev => {
                                  const sectionCourses = prev[sectionKey] || [];
                                  if (e.target.checked) {
                                    return {
                                      ...prev,
                                      [sectionKey]: [...sectionCourses, course.id],
                                    };
                                  } else {
                                    return {
                                      ...prev,
                                      [sectionKey]: sectionCourses.filter(
                                        id => id !== course.id
                                      ),
                                    };
                                  }
                                });
                              }}
                              style={{ accentColor: 'var(--primary)' }}
                              className="w-4 h-4 rounded border-gray-300 focus:ring-primary mt-1 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {course.code}
                              </p>
                              <p className="text-xs text-gray-600">
                                {course.title}
                              </p>
                              {course.credits && (
                                <p className="text-xs text-gray-500">
                                  {course.credits} credits
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Course Search - Bottom */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Quick Course Search</h3>
            <p className="text-sm text-gray-600 mb-3">
              Didn't find what you need above? Search all courses here.
            </p>
          </div>
          <CourseSearch
            universityId={universityId}
            onSelect={handleQuickCourseSelect}
            placeholder="Search by course code or name..."
            size="medium"
            fullWidth
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-between pt-4">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedCount === 0 || isLoading}
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      </form>
    </WizardFormLayout>
  );
}
