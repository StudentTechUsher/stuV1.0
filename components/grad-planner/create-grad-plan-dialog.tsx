'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import type { ProgramRow } from '@/types/program';

// === Types that match the normalized requirements we built earlier ===
type Credits =
  | { fixed: number }
  | { variable: true; min?: number; max?: number }
  | null;

interface CourseBlock {
  type: 'course';
  code: string;
  title: string;
  credits: Credits;
  status?: 'active' | 'retired';
}

interface ContainerBlock {
  type: 'option' | 'requirement';
  label?: string;
  title?: string;
  rule?: { type: string; min_count?: number; of_count?: number; unit?: string };
  blocks?: Block[];
}

type Block = CourseBlock | ContainerBlock;

interface RichRequirement {
  subtitle: string;
  requirement?: {
    index?: number;
    rule?: { type: string; min_count?: number; of_count?: number; unit?: string };
  };
  blocks?: Block[];
}

// === Types for Program Requirements ===
interface ProgramCourse {
  code: string;
  title: string;
  credits: number;
}

interface SubRequirement {
  courses: ProgramCourse[];
  description: string;
  requirementId: string;
}

interface ProgramRequirement {
  notes?: string;
  description: string;
  requirementId: number;
  subRequirements?: SubRequirement[];
  courses?: ProgramCourse[];
  otherRequirement?: string;
  steps?: string[];
}

// === Props ===
interface CreateGradPlanDialogProps {
  open: boolean;
  onClose: () => void;
  programsData: ProgramRow[];
  genEdData: ProgramRow[];
}

export default function CreateGradPlanDialog({
  open,
  onClose,
  programsData,
  genEdData
}: Readonly<CreateGradPlanDialogProps>) {

  // State: selected courses per requirement (array because we may need multiple dropdowns)
  const [selectedCourses, setSelectedCourses] = useState<Record<string, string[]>>({});
  // State: selected courses for program requirements
  const [selectedProgramCourses, setSelectedProgramCourses] = useState<Record<string, string[]>>({});

  // ---- Helpers ----

  const parseRequirementsFromGenEd = useCallback((): RichRequirement[] => {
    if (!genEdData || genEdData.length === 0) return [];
    const all: RichRequirement[] = [];

    genEdData.forEach(program => {
      if (!program.requirements) return;
      try {
        const req = typeof program.requirements === 'string'
          ? JSON.parse(program.requirements)
          : program.requirements;

        if (Array.isArray(req)) {
          // We only keep objects that look like our RichRequirement
          const filtered = req.filter((r: unknown): r is RichRequirement => {
            return (
              typeof r === 'object' &&
              r !== null &&
              'subtitle' in r &&
              typeof (r as { subtitle?: unknown }).subtitle === 'string'
            );
          });
          all.push(...filtered);
        }
      } catch (e) {
        console.error('Error parsing requirements:', e);
      }
    });

    return all;
  }, [genEdData]);

  // Parse program requirements from programsData
  const parseProgramRequirements = useCallback((): ProgramRequirement[] => {
    if (!programsData || programsData.length === 0) return [];
    const all: ProgramRequirement[] = [];

    programsData.forEach(program => {
      if (!program.requirements) return;
      try {
        const req = typeof program.requirements === 'string'
          ? JSON.parse(program.requirements)
          : program.requirements;

        // Look for programRequirements array
        if (Array.isArray(req?.programRequirements)) {
          all.push(...req.programRequirements);
        }
      } catch (e) {
        console.error('Error parsing program requirements:', e);
      }
    });

    return all;
  }, [programsData]);

  // Get dropdown count for program requirements
  const getProgramDropdownCount = useCallback((req: ProgramRequirement | SubRequirement): number => {
    const description = req.description || '';
    // Extract number from description like "Complete 2 Courses" or "Complete 1 of 3 Courses"
    const regex = /Complete (\d+)/i;
    const match = regex.exec(description);
    return match ? parseInt(match[1], 10) : 1;
  }, []);

  // Recursively collect course blocks from any nested structure
  const collectCourses = useCallback((blocks?: Block[]): CourseBlock[] => {
    if (!blocks) return [];
    const out: CourseBlock[] = [];

    for (const b of blocks) {
      if (!b) continue;
      if (b.type === 'course') {
        out.push(b);
      } else if ((b.type === 'option' || b.type === 'requirement') && (b).blocks) {
        out.push(...collectCourses((b).blocks));
      }
    }

    return out;
  }, []);

  // Credits formatter
  const creditText = (credits: Credits): string => {
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
  };

  // Count how many dropdowns are needed for a requirement (based on rule.min_count, default 1)
  const getDropdownCount = (req: RichRequirement): number => {
    const min =
      req?.requirement?.rule?.min_count &&
      Number.isFinite(req.requirement.rule.min_count)
        ? (req.requirement.rule.min_count)
        : 1;
    return Math.max(1, min);
  };

  // memoize parsed requirements for performance
  const requirements = useMemo(() => parseRequirementsFromGenEd(), [parseRequirementsFromGenEd]);
  const programRequirements = useMemo(() => parseProgramRequirements(), [parseProgramRequirements]);

  // course options per requirement (memoized map)
  const requirementCoursesMap = useMemo<Record<string, CourseBlock[]>>(() => {
    const map: Record<string, CourseBlock[]> = {};
    for (const req of requirements) {
      map[req.subtitle] = collectCourses(req.blocks);
    }
    return map;
  }, [collectCourses, requirements]);

  // ensure state array length matches dropdown count for each requirement
  const ensureSlots = useCallback((subtitle: string, count: number) => {
    setSelectedCourses(prev => {
      const prevList = prev[subtitle] ?? [];
      if (prevList.length === count) return prev;
      const nextList = [...prevList];
      while (nextList.length < count) nextList.push('');
      if (nextList.length > count) nextList.length = count;
      return { ...prev, [subtitle]: nextList };
    });
  }, []);

  // ensure state array length for program requirements
  const ensureProgramSlots = useCallback((requirementKey: string, count: number) => {
    setSelectedProgramCourses(prev => {
      const prevList = prev[requirementKey] ?? [];
      if (prevList.length === count) return prev;
      const nextList = [...prevList];
      while (nextList.length < count) nextList.push('');
      if (nextList.length > count) nextList.length = count;
      return { ...prev, [requirementKey]: nextList };
    });
  }, []);

  // Initialize slots for all requirements when they change
  useEffect(() => {
    requirements.forEach(req => {
      const dropdownCount = getDropdownCount(req);
      ensureSlots(req.subtitle, dropdownCount);
    });

    // Initialize slots for program requirements
    programRequirements.forEach(req => {
      if (req.courses) {
        const dropdownCount = getProgramDropdownCount(req);
        ensureProgramSlots(`req-${req.requirementId}`, dropdownCount);
      }
      if (req.subRequirements) {
        req.subRequirements.forEach(subReq => {
          const dropdownCount = getProgramDropdownCount(subReq);
          ensureProgramSlots(`subreq-${subReq.requirementId}`, dropdownCount);
        });
      }
    });
  }, [requirements, ensureSlots, programRequirements, ensureProgramSlots, getProgramDropdownCount]);

  // handle a specific slot selection for a requirement
  const handleCourseSelection = (subtitle: string, slotIndex: number, courseCode: string) => {
    setSelectedCourses(prev => {
      const existing = prev[subtitle] ?? [];
      const next = [...existing];
      next[slotIndex] = courseCode;
      return { ...prev, [subtitle]: next };
    });
  };

  // handle program course selection
  const handleProgramCourseSelection = (requirementKey: string, slotIndex: number, courseCode: string) => {
    setSelectedProgramCourses(prev => {
      const existing = prev[requirementKey] ?? [];
      const next = [...existing];
      next[slotIndex] = courseCode;
      return { ...prev, [requirementKey]: next };
    });
  };

  // all selected?
  const isAnythingSelected = Object.values(selectedCourses).some(arr => arr?.some(Boolean)) ||
                            Object.values(selectedProgramCourses).some(arr => arr?.some(Boolean));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Create New Grad Plan
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Available Programs */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Available Programs:</Typography>
            {programsData?.length ? (
              <Box component="ul" sx={{ pl: 2 }}>
                {programsData.map((program) => (
                  <Box component="li" key={program.id} sx={{ mb: 1 }}>
                    <strong>{program.name}</strong> ({program.program_type})
                    {program.version && <span> — Version: {program.version}</span>}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>No programs available</Typography>
            )}
          </Box>

          {/* General Education Requirements */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>General Education Requirements:</Typography>

            {requirements.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {requirements.map((req, idx) => {
                  const dropdownCount = getDropdownCount(req);
                  const courses = requirementCoursesMap[req.subtitle] || [];

                  return (
                    <Box key={`${req.subtitle}-${idx}`} sx={{ py: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {req.subtitle}
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {Array.from({ length: dropdownCount }).map((_, slot) => (
                          <FormControl key={`${req.subtitle}-slot-${slot}`} fullWidth>
                            <InputLabel>
                              {dropdownCount > 1
                                ? `${req.subtitle} — Select course #${slot + 1}`
                                : req.subtitle}
                            </InputLabel>
                            <Select
                              value={(selectedCourses[req.subtitle]?.[slot] ?? '')}
                              label={
                                dropdownCount > 1
                                  ? `${req.subtitle} — Select course #${slot + 1}`
                                  : req.subtitle
                              }
                              onChange={(e) => handleCourseSelection(req.subtitle, slot, e.target.value)}
                            >
                              <MenuItem value=""><em>Select a course</em></MenuItem>
                              {courses.map((c) => (
                                <MenuItem key={`${req.subtitle}-${c.code}`} value={c.code}>
                                  {c.code} — {c.title} ({creditText(c.credits)})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ))}
                      </Box>

                      {/* Divider between requirement sections */}
                      {idx < requirements.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography>No general education requirements found</Typography>
            )}
          </Box>

          {/* Program Requirements */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Program Requirements:</Typography>

            {programRequirements.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {programRequirements.map((req, idx) => (
                  <Box key={`prog-req-${req.requirementId}-${idx}`} sx={{ py: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Requirement {req.requirementId}: {req.description}
                    </Typography>
                    
                    {req.notes && (
                      <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                        Note: {req.notes}
                      </Typography>
                    )}

                    {req.otherRequirement && (
                      <Typography variant="body2" sx={{ mb: 2, color: 'warning.main' }}>
                        Additional Requirement: {req.otherRequirement}
                      </Typography>
                    )}

                    {req.steps && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>Steps:</Typography>
                        <Box component="ul" sx={{ pl: 2 }}>
                          {req.steps.map((step) => (
                            <Box component="li" key={step} sx={{ mb: 0.5 }}>
                              <Typography variant="body2">{step}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Direct courses */}
                    {req.courses && req.courses.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>Select courses:</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {Array.from({ length: getProgramDropdownCount(req) }).map((_, slot) => (
                            <FormControl key={`req-${req.requirementId}-slot-${slot}`} fullWidth>
                              <InputLabel>
                                {getProgramDropdownCount(req) > 1
                                  ? `Requirement ${req.requirementId} — Course #${slot + 1}`
                                  : `Requirement ${req.requirementId}`}
                              </InputLabel>
                              <Select
                                value={(selectedProgramCourses[`req-${req.requirementId}`]?.[slot] ?? '')}
                                label={
                                  getProgramDropdownCount(req) > 1
                                    ? `Requirement ${req.requirementId} — Course #${slot + 1}`
                                    : `Requirement ${req.requirementId}`
                                }
                                onChange={(e) => handleProgramCourseSelection(`req-${req.requirementId}`, slot, e.target.value)}
                              >
                                <MenuItem value=""><em>Select a course</em></MenuItem>
                                {(req.courses || []).map((course) => (
                                  <MenuItem key={`req-${req.requirementId}-${course.code}`} value={course.code}>
                                    {course.code} — {course.title} ({course.credits} credits)
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Sub-requirements */}
                    {req.subRequirements && req.subRequirements.length > 0 && (
                      <Box sx={{ ml: 2 }}>
                        {req.subRequirements.map((subReq, subIdx) => (
                          <Box key={`subreq-${subReq.requirementId}-${subIdx}`} sx={{ mb: 2 }}>
                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                              Sub-requirement {subReq.requirementId}: {subReq.description}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {Array.from({ length: getProgramDropdownCount(subReq) }).map((_, slot) => (
                                <FormControl key={`subreq-${subReq.requirementId}-slot-${slot}`} fullWidth>
                                  <InputLabel>
                                    {getProgramDropdownCount(subReq) > 1
                                      ? `Sub-req ${subReq.requirementId} — Course #${slot + 1}`
                                      : `Sub-req ${subReq.requirementId}`}
                                  </InputLabel>
                                  <Select
                                    value={(selectedProgramCourses[`subreq-${subReq.requirementId}`]?.[slot] ?? '')}
                                    label={
                                      getProgramDropdownCount(subReq) > 1
                                        ? `Sub-req ${subReq.requirementId} — Course #${slot + 1}`
                                        : `Sub-req ${subReq.requirementId}`
                                    }
                                    onChange={(e) => handleProgramCourseSelection(`subreq-${subReq.requirementId}`, slot, e.target.value)}
                                  >
                                    <MenuItem value=""><em>Select a course</em></MenuItem>
                                    {subReq.courses.map((course) => (
                                      <MenuItem key={`subreq-${subReq.requirementId}-${course.code}`} value={course.code}>
                                        {course.code} — {course.title} ({course.credits} credits)
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Divider between program requirements */}
                    {idx < programRequirements.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>No program requirements found</Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ gap: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            console.log('Selected GenEd courses:', selectedCourses);
            console.log('Selected Program courses:', selectedProgramCourses);
            onClose();
          }}
          disabled={!isAnythingSelected}
        >
          Create Plan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
