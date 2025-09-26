'use client';

import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import EditIcon from '@mui/icons-material/Edit';
import { GraduationPlan } from '@/types/graduation-plan';

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface GraduationPlannerProps {
  plan?: Record<string, unknown> | GraduationPlan | Term[];
  isEditMode?: boolean;
  onPlanUpdate?: (updatedPlan: Term[]) => void;
  studentProfile?: {
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  };
}

// Separate component for the course move TextField
interface CourseMoveFieldProps {
  currentTerm: number;
  maxTerms: number;
  course: Course;
  termIndex: number;
  courseIndex: number;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
}

function CourseMoveField({ currentTerm, maxTerms, course, termIndex, courseIndex, onMoveCourse }: CourseMoveFieldProps) {
  const [value, setValue] = useState(currentTerm);
  
  // Create a unique identifier for this course instance
  const courseUniqueId = `${termIndex}-${courseIndex}-${course.code}`;

  // Update value when currentTerm changes (after course move)
  useEffect(() => {
    setValue(currentTerm);
  }, [currentTerm, courseUniqueId, value]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const newTermNumber = event.target.value as number;
    setValue(newTermNumber);
    
    // Immediately move the course when selection changes
    if (newTermNumber !== currentTerm && newTermNumber >= 1 && newTermNumber <= maxTerms) {
      onMoveCourse(termIndex, courseIndex, newTermNumber);
    }
  };

  // Generate term options
  const termOptions = [];
  for (let i = 1; i <= maxTerms; i++) {
    termOptions.push(
      <MenuItem key={i} value={i}>
        Term {i}
      </MenuItem>
    );
  }

  return (
    <FormControl size="small" sx={{ width: '100%', maxWidth: '160px' }}>
      <InputLabel sx={{ fontSize: '0.75rem', color: '#1976d2' }}>Select Term</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label="Select Term"
        onClick={(e) => e.stopPropagation()}
        sx={{ 
          fontSize: '0.75rem',
          height: '36px',
          backgroundColor: '#fff',
          '& .MuiSelect-select': {
            paddingTop: '8px',
            paddingBottom: '8px',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--action-edit)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--action-edit-hover)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--action-edit-hover)'
          }
        }}
      >
        {termOptions}
      </Select>
    </FormControl>
  );
}

export default function GraduationPlanner({ plan, isEditMode = false, onPlanUpdate }: Readonly<GraduationPlannerProps>) {

  // State for managing plan data when in edit mode
  const [editablePlanData, setEditablePlanData] = useState<Term[]>([]);

  // Handle different possible database structures
  const planData = useMemo((): Term[] => {
    if (!plan) return [];
    
    const planRecord = plan as Record<string, unknown>;
    
    // Check if plan itself is an array of terms (direct plan_details passed)
    if (Array.isArray(plan)) {
      return plan;
    }
    
    // Check for the actual database structure: plan_details.plan
    if (planRecord.plan_details && 
        typeof planRecord.plan_details === 'object' && 
        planRecord.plan_details !== null) {
      const planDetails = planRecord.plan_details as Record<string, unknown>;
      if (Array.isArray(planDetails.plan)) {
        return planDetails.plan as Term[];
      }
    }
    // Check if plan has a 'plan' property (nested structure) - AI RESPONSE FORMAT
    else if (Array.isArray(planRecord.plan)) {
      return planRecord.plan as Term[];
    }
    
    // Add more flexible parsing similar to GradPlanViewer
    // Check for semesters property
    if (Array.isArray(planRecord.semesters)) {
      return planRecord.semesters as Term[];
    }
    
    // Check for terms property
    if (Array.isArray(planRecord.terms)) {
      return planRecord.terms as Term[];
    }
    
    return [];
  }, [plan]);

  // Initialize editable plan data when plan changes or edit mode changes
  useEffect(() => {
    if (planData && planData.length > 0) {
      setEditablePlanData(JSON.parse(JSON.stringify(planData))); // Deep copy
    }
  }, [planData, isEditMode]);

  // Use editable data when in edit mode, otherwise use original data
  const currentPlanData = isEditMode ? editablePlanData : planData;

  // Derive a unique, ordered list of requirements fulfilled across the entire plan
  const fulfilledRequirements = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    currentPlanData.forEach(term => {
      term.courses?.forEach(course => {
        if (Array.isArray(course.fulfills)) {
          course.fulfills.forEach(reqRaw => {
            const req = typeof reqRaw === 'string' ? reqRaw.trim() : '';
            if (req && !seen.has(req)) {
              seen.add(req);
              ordered.push(req);
            }
          });
        }
      });
    });
    return ordered;
  }, [currentPlanData]);

  // Function to move a course between terms
  const moveCourse = (fromTermIndex: number, courseIndex: number, toTermNumber: number) => {
    if (!isEditMode || toTermNumber < 1 || toTermNumber > editablePlanData.length) {
      return;
    }

    const toTermIndex = toTermNumber - 1;
    if (fromTermIndex === toTermIndex) {
      return; // No move needed
    }

    setEditablePlanData(prevData => {
      // Create a deep copy to avoid reference issues
      const newData = prevData.map(term => ({
        ...term,
        courses: term.courses ? [...term.courses] : []
      }));
      
      const sourceTerm = newData[fromTermIndex];
      const course = sourceTerm.courses?.[courseIndex];
      
      if (!course) {
        console.error(`❌ Course not found at term ${fromTermIndex}, index ${courseIndex}`);
        return prevData;
      }

      // Remove course from source term
      if (sourceTerm.courses) {
        sourceTerm.courses.splice(courseIndex, 1);
        
        // Update source term credits
        const sourceCredits = sourceTerm.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
        sourceTerm.credits_planned = sourceCredits;
      }

      // Add course to destination term
      const destTerm = newData[toTermIndex];
      if (!destTerm.courses) {
        destTerm.courses = [];
      }
      destTerm.courses.push(course);
      
      // Update destination term credits
      const destCredits = destTerm.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
      destTerm.credits_planned = destCredits;
      
      // Notify parent component of the change
      if (onPlanUpdate) {
        onPlanUpdate(newData);
      }
      
      return newData;
    });
  };

  if (!planData || planData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" className="font-header" color="error">
          Invalid plan structure - no terms found
        </Typography>
        <Typography variant="body2" className="font-body" color="text.secondary" gutterBottom>
          Expected to find an array of terms, but got:
        </Typography>
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">
          {JSON.stringify(plan, null, 2)}
        </pre>
      </Box>
    );
  }

  // Extract additional info from plan or plan_details if available
  const planRecord = plan as Record<string, unknown>;
  
  // If we're passed plan_details directly, metadata is at root level
  // If we're passed the full database record, metadata is in plan_details
  const sourceData = planRecord.plan_details ? 
    (planRecord.plan_details as Record<string, unknown>) : 
    planRecord;
  
  const programName = sourceData.program as string;
  const assumptions = sourceData.assumptions as string[];
  const durationYears = sourceData.duration_years as number;

  return (
    <Box sx={{ p: 2 }}>
      {/* Edit mode banner removed per request */}
      
      <Typography variant="h5" className="font-header" gutterBottom>
        Graduation Plan
        {programName && (
          <Typography variant="subtitle1" className="font-body" color="text.secondary" component="span" sx={{ ml: 1 }}>
            - {programName}
          </Typography>
        )}
      </Typography>
      
      <Box sx={{
        mb: 3,
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 90%)',
        border: '1px solid #bbdefb',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center'
      }}>
        <Chip
          label={`${currentPlanData.length} term${currentPlanData.length === 1 ? '' : 's'} planned`}
          sx={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #90caf9',
            fontWeight: 'bold'
          }}
          size="small"
        />
        {Boolean(durationYears) && (
          <Chip
            label={`${durationYears} year${durationYears === 1 ? '' : 's'}`}
            size="small"
            sx={{
              backgroundColor: '#ede7f6',
              border: '1px solid #b39ddb',
              fontWeight: 'bold'
            }}
          />
        )}
        <Chip
          label={`Total Credits: ${currentPlanData.reduce((total, term) => {
            const termCredits = term.credits_planned || (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
            return total + termCredits;
          }, 0)}`}
          size="small"
          color="primary"
          sx={{
            backgroundColor: '#e8f5e9',
            border: '1px solid #a5d6a7',
            color: '#2e7d32',
            fontWeight: 'bold'
          }}
        />
        {fulfilledRequirements.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" className="font-body" sx={{ fontWeight: 'bold', mr: 0.5, color: '#1565c0' }}>
              Requirements:
            </Typography>
            {fulfilledRequirements.map(req => (
              <Chip
                key={req}
                label={req}
                size="small"
                sx={{
                  backgroundColor: '#fffde7',
                  border: '1px solid #fff59d',
                  fontSize: '0.65rem',
                  height: 22,
                  fontWeight: 500
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {assumptions && assumptions.length > 0 && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid var(--action-edit)' }}>
          <Typography variant="h6" className="font-header" gutterBottom>
            Plan Assumptions:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {assumptions.map((assumption) => (
              <Typography key={assumption} component="li" variant="body2" className="font-body">
                {assumption}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" className="font-header" sx={{ color: 'text.secondary', mb: 2 }}>
          Academic Schedule ({currentPlanData.length} terms)
        </Typography>
        
        {/* Display terms in a 2-column grid layout */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 3,
          '@media (max-width: 900px)': {
            gridTemplateColumns: '1fr' // Single column on smaller screens
          }
        }}>
          {currentPlanData.map((term, index) => {
            
            const termCredits = term.credits_planned || 
                               (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
            
            return (
              <Box 
                key={term.term || `term-${index}`} 
                sx={{ 
                  p: 3, 
                  border: '2px solid var(--border)',
                  borderRadius: 2,
                  backgroundColor: 'var(--muted)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  minHeight: '200px' // Ensure consistent height
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" className="font-header" sx={{ color: 'var(--action-info)', fontWeight: 'bold' }}>
                    Term {term.term || index + 1}
                  </Typography>
                  <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', color: 'var(--action-info)' }}>
                    {termCredits} Credits
                  </Typography>
                </Box>
                
                {term.notes && (
                  <Box sx={{ mb: 2, p: 1, backgroundColor: '#fff3cd', borderRadius: 1 }}>
                    <Typography variant="body2" className="font-body" color="text.secondary">
                      {term.notes}
                    </Typography>
                  </Box>
                )}

                {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle1" className="font-header" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Courses ({term.courses.length}):
                    </Typography>
                    {/* Single column of course cards within each term */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {term.courses.map((course: Course, courseIndex: number) => {
                        // Add validation to ensure we have required fields
                        if (!course.code || !course.title) {
                          console.warn(`⚠️ Skipping invalid course in term ${index + 1}:`, course);
                          return null;
                        }
                        
                        return (
                        <Box 
                          key={`term-${index}-course-${courseIndex}-${course.code}-${course.title?.substring(0, 10)}`} 
                          sx={{ 
                            p: 2, 
                            backgroundColor: isEditMode ? '#fff8e1' : 'white', 
                            borderRadius: 1, 
                            border: isEditMode ? '2px solid var(--action-edit)' : '1px solid var(--border-light)',
                            minHeight: '80px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: isEditMode ? 'pointer' : 'default',
                            '&:hover': isEditMode ? {
                              backgroundColor: 'var(--warning-background, #fff3e0)',
                              borderColor: 'var(--action-edit)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            } : {},
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', mb: 1 }}>
                              {course.code}: {course.title}
                            </Typography>
                            {isEditMode && (
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  p: 0.5,
                                  color: 'var(--action-edit)',
                                  '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.1)' }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Add course edit functionality
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          <Box>
                            <Typography variant="caption" className="font-body" color="text.secondary" display="block">
                              {course.credits} credits
                            </Typography>
                            {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
                              <Typography variant="caption" className="font-body" color="primary" display="block">
                                {course.fulfills.join(', ')}
                              </Typography>
                            )}
                            {isEditMode && (
                              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" className="font-body" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                  Move:
                                </Typography>
                                <CourseMoveField
                                  currentTerm={index + 1}
                                  maxTerms={currentPlanData.length}
                                  course={course}
                                  termIndex={index}
                                  courseIndex={courseIndex}
                                  onMoveCourse={moveCourse}
                                />
                              </Box>
                            )}
                          </Box>
                        </Box>
                        );
                      }).filter(Boolean)} {/* Filter out null returns */}
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" className="font-body" color="text.secondary">
                    No courses defined for this term
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
