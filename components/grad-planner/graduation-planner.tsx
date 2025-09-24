'use client';

import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
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

  // Update value when currentTerm changes (after course move)
  useEffect(() => {
    setValue(currentTerm);
  }, [currentTerm]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const newTermNumber = event.target.value as number;
    setValue(newTermNumber);
    
    // Immediately move the course when selection changes
    if (newTermNumber !== currentTerm && newTermNumber >= 1 && newTermNumber <= maxTerms) {
      console.log(`Moving course ${course.code} from term ${currentTerm} to term ${newTermNumber}`);
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
    <FormControl size="small" sx={{ width: '100%', maxWidth: '140px' }}>
      <InputLabel sx={{ fontSize: '0.75rem' }}>Move to Term</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label="Move to Term"
        onClick={(e) => e.stopPropagation()}
        sx={{ 
          fontSize: '0.75rem',
          height: '32px',
          '& .MuiSelect-select': {
            paddingTop: '6px',
            paddingBottom: '6px',
            fontSize: '0.75rem'
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
    
    // Check for the actual database structure: plan_details.plan
    if (planRecord.plan_details && 
        typeof planRecord.plan_details === 'object' && 
        planRecord.plan_details !== null) {
      const planDetails = planRecord.plan_details as Record<string, unknown>;
      if (Array.isArray(planDetails.plan)) {
        return planDetails.plan as Term[];
      }
    }
    // Check if plan has a 'plan' property (nested structure)
    else if (Array.isArray(planRecord.plan)) {
      return planRecord.plan as Term[];
    }
    // Check if plan itself is an array of terms
    else if (Array.isArray(plan)) {
      return plan;
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
      const newData = [...prevData];
      const course = newData[fromTermIndex].courses?.[courseIndex];
      
      if (!course) return prevData;

      // Remove course from source term
      if (newData[fromTermIndex].courses) {
        newData[fromTermIndex].courses = newData[fromTermIndex].courses.filter((_, index) => index !== courseIndex);
        
        // Update source term credits
        const sourceCredits = newData[fromTermIndex].courses.reduce((sum, c) => sum + (c.credits || 0), 0);
        newData[fromTermIndex].credits_planned = sourceCredits;
      }

      // Add course to destination term
      if (!newData[toTermIndex].courses) {
        newData[toTermIndex].courses = [];
      }
      newData[toTermIndex].courses.push(course);
      
      // Update destination term credits
      const destCredits = newData[toTermIndex].courses.reduce((sum, c) => sum + (c.credits || 0), 0);
      newData[toTermIndex].credits_planned = destCredits;

      console.log(`Moved course ${course.code} from term ${fromTermIndex + 1} to term ${toTermNumber}`);
      
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

  // Extract additional info from plan_details if available
  const planRecord = plan as Record<string, unknown>;
  const planDetails = (planRecord.plan_details as Record<string, unknown>) || {};
  const programName = planDetails.program as string;
  const assumptions = planDetails.assumptions as string[];
  const durationYears = planDetails.duration_years as number;

  return (
    <Box sx={{ p: 2 }}>
      {isEditMode && (
        <Box sx={{ 
          mb: 3, 
          p: 2, 
          backgroundColor: 'var(--warning-background, #fff3e0)',
          borderRadius: 1,
          border: '2px solid var(--action-edit)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Typography variant="h6" className="font-header" sx={{ color: 'var(--action-edit-hover)' }}>
            Edit Mode Active
          </Typography>
          <Typography variant="body2" className="font-body" color="text.secondary">
            Make changes to your graduation plan. Click &quot;Submit for Approval&quot; when finished.
          </Typography>
        </Box>
      )}
      
      <Typography variant="h5" className="font-header" gutterBottom>
        Graduation Plan
        {programName && (
          <Typography variant="subtitle1" className="font-body" color="text.secondary" component="span" sx={{ ml: 1 }}>
            - {programName}
          </Typography>
        )}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body1" className="font-body">
          {currentPlanData.length} terms planned
        </Typography>
        {Boolean(durationYears) && (
          <Typography variant="body1" className="font-body">
            {durationYears} years
          </Typography>
        )}
        <Typography variant="body1" className="font-body">
          Total Credits: {currentPlanData.reduce((total, term) => {
            const termCredits = term.credits_planned || 
                               (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
            return total + termCredits;
          }, 0)}
        </Typography>
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
                      {term.courses.map((course: Course, courseIndex: number) => (
                        <Box 
                          key={`${course.code}-${courseIndex}`} 
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
                              borderColor: 'var(--action-edit)'
                            } : {}
                          }}
                          onClick={isEditMode ? () => {
                            console.log('Edit course:', course.code);
                            // TODO: Add course edit functionality
                          } : undefined}
                        >
                          <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {course.code}: {course.title}
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
                                  console.log('Edit course:', course.code);
                                  // TODO: Add course edit functionality
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Typography>
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
                      ))}
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
