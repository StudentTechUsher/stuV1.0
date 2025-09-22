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
  
  // Create a unique identifier for this course instance
  const courseUniqueId = `${termIndex}-${courseIndex}-${course.code}`;

  // Update value when currentTerm changes (after course move)
  useEffect(() => {
    console.log(`🔄 CourseMoveField [${courseUniqueId}] - currentTerm changed from ${value} to ${currentTerm}`);
    setValue(currentTerm);
  }, [currentTerm, courseUniqueId, value]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const newTermNumber = event.target.value as number;
    console.log(`🎯 CourseMoveField [${courseUniqueId}] - handleChange: ${currentTerm} → ${newTermNumber}`);
    setValue(newTermNumber);
    
    // Immediately move the course when selection changes
    if (newTermNumber !== currentTerm && newTermNumber >= 1 && newTermNumber <= maxTerms) {
      console.log(`📦 Moving course ${course.code} from term ${currentTerm} to term ${newTermNumber} (termIndex: ${termIndex}, courseIndex: ${courseIndex})`);
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
            borderColor: '#1976d2',
            borderWidth: '2px'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1565c0'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976d2'
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
    
    console.log('🔍 GraduationPlanner planData analysis:', {
      planType: typeof plan,
      isArray: Array.isArray(plan),
      hasplanDetails: Boolean(planRecord.plan_details),
      hasPlanProperty: Boolean(planRecord.plan),
      planStructure: Object.keys(planRecord),
      rawPlan: plan
    });
    
    // Check if plan itself is an array of terms (direct plan_details passed)
    if (Array.isArray(plan)) {
      console.log('📊 Using direct array structure, terms found:', plan.length);
      return plan;
    }
    
    // Check for the actual database structure: plan_details.plan
    if (planRecord.plan_details && 
        typeof planRecord.plan_details === 'object' && 
        planRecord.plan_details !== null) {
      const planDetails = planRecord.plan_details as Record<string, unknown>;
      if (Array.isArray(planDetails.plan)) {
        console.log('📊 Using plan_details.plan structure, terms found:', planDetails.plan.length);
        return planDetails.plan as Term[];
      }
    }
    // Check if plan has a 'plan' property (nested structure) - AI RESPONSE FORMAT
    else if (Array.isArray(planRecord.plan)) {
      console.log('📊 Using direct .plan structure (AI format), terms found:', planRecord.plan.length);
      console.log('📊 Sample courses from Term 1:', planRecord.plan[0] ? (planRecord.plan[0] as Term).courses : 'No Term 1');
      return planRecord.plan as Term[];
    }
    
    // Add more flexible parsing similar to GradPlanViewer
    // Check for semesters property
    if (Array.isArray(planRecord.semesters)) {
      console.log('📊 Using .semesters structure, terms found:', planRecord.semesters.length);
      return planRecord.semesters as Term[];
    }
    
    // Check for terms property
    if (Array.isArray(planRecord.terms)) {
      console.log('📊 Using .terms structure, terms found:', planRecord.terms.length);
      return planRecord.terms as Term[];
    }
    
    console.log('⚠️ No valid plan structure found');
    return [];
  }, [plan]);

  // Initialize editable plan data when plan changes or edit mode changes
  useEffect(() => {
    if (planData && planData.length > 0) {
      console.log(`🔄 Initializing editable plan data:`, {
        termsCount: planData.length,
        isEditMode,
        planData: planData.map((term, idx) => ({
          termIndex: idx,
          term: term.term,
          coursesCount: term.courses?.length || 0,
          courses: term.courses?.map(c => c.code) || []
        }))
      });
      setEditablePlanData(JSON.parse(JSON.stringify(planData))); // Deep copy
    }
  }, [planData, isEditMode]);

  // Debug effect to track changes in editablePlanData
  useEffect(() => {
    if (editablePlanData.length > 0) {
      console.log(`📊 EditablePlanData updated:`, {
        termsCount: editablePlanData.length,
        termsSummary: editablePlanData.map((term, idx) => ({
          termIndex: idx,
          term: term.term,
          coursesCount: term.courses?.length || 0,
          courses: term.courses?.map(c => `${c.code}`) || []
        }))
      });
    }
  }, [editablePlanData]);

  // Use editable data when in edit mode, otherwise use original data
  const currentPlanData = isEditMode ? editablePlanData : planData;

  // Function to move a course between terms
  const moveCourse = (fromTermIndex: number, courseIndex: number, toTermNumber: number) => {
    console.log(`🚀 moveCourse called:`, {
      fromTermIndex,
      courseIndex,
      toTermNumber,
      isEditMode,
      editablePlanDataLength: editablePlanData.length
    });

    if (!isEditMode || toTermNumber < 1 || toTermNumber > editablePlanData.length) {
      console.log(`❌ moveCourse aborted: invalid conditions`);
      return;
    }

    const toTermIndex = toTermNumber - 1;
    if (fromTermIndex === toTermIndex) {
      console.log(`❌ moveCourse aborted: same term (${fromTermIndex})`);
      return; // No move needed
    }

    setEditablePlanData(prevData => {
      console.log(`📊 moveCourse: Processing move...`);
      
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

      console.log(`📦 Moving course: ${course.code} (${course.title}) from Term ${fromTermIndex + 1} to Term ${toTermNumber}`);

      // Remove course from source term
      if (sourceTerm.courses) {
        sourceTerm.courses.splice(courseIndex, 1);
        
        // Update source term credits
        const sourceCredits = sourceTerm.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
        sourceTerm.credits_planned = sourceCredits;
        console.log(`📝 Source term ${fromTermIndex + 1} updated: ${sourceTerm.courses.length} courses, ${sourceCredits} credits`);
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
      console.log(`📝 Destination term ${toTermNumber} updated: ${destTerm.courses.length} courses, ${destCredits} credits`);

      console.log(`✅ Course ${course.code} successfully moved from term ${fromTermIndex + 1} to term ${toTermNumber}`);
      
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
        <Typography variant="h6" color="error">
          Invalid plan structure - no terms found
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Expected to find an array of terms, but got:
        </Typography>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '4px', 
          overflow: 'auto',
          fontSize: '12px'
        }}>
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
      {isEditMode && (
        <Box sx={{ 
          mb: 3, 
          p: 3, 
          backgroundColor: '#e8f5e8', 
          borderRadius: 2, 
          border: '2px solid #4caf50',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)'
        }}>
          <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            ✏️ Edit Mode Active
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Click and drag courses to move them between terms using the dropdown menu. Changes will be saved when you submit for approval.
          </Typography>
        </Box>
      )}
      
      <Typography variant="h5" gutterBottom>
        Graduation Plan
        {programName && (
          <Typography variant="subtitle1" color="text.secondary" component="span" sx={{ ml: 1 }}>
            - {programName}
          </Typography>
        )}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body1">
          📚 {currentPlanData.length} terms planned
        </Typography>
        {Boolean(durationYears) && (
          <Typography variant="body1">
            ⏱️ {durationYears} years
          </Typography>
        )}
        <Typography variant="body1">
          📊 Total Credits: {currentPlanData.reduce((total, term) => {
            const termCredits = term.credits_planned || 
                               (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
            return total + termCredits;
          }, 0)}
        </Typography>
      </Box>

      {assumptions && assumptions.length > 0 && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid #ffb74d' }}>
          <Typography variant="h6" gutterBottom>
            📋 Plan Assumptions:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {assumptions.map((assumption) => (
              <Typography key={assumption} component="li" variant="body2">
                {assumption}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" sx={{ color: '#666', mb: 2 }}>
          📅 Academic Schedule ({currentPlanData.length} terms)
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
            console.log(`🎯 Rendering term ${index + 1}:`, {
              term: term.term,
              coursesExist: Boolean(term.courses),
              coursesIsArray: Array.isArray(term.courses),
              coursesLength: term.courses ? term.courses.length : 0,
              coursesPreview: term.courses ? term.courses.slice(0, 2) : null,
              allCourses: term.courses,
              IS400courses: term.courses ? term.courses.filter(c => c.code?.startsWith('IS 4')) : []
            });

            // Count valid vs invalid courses
            if (term.courses && Array.isArray(term.courses)) {
              const validCourses = term.courses.filter(c => c.code && c.title);
              const invalidCourses = term.courses.filter(c => !c.code || !c.title);
              console.log(`📊 Term ${index + 1} course validation:`, {
                total: term.courses.length,
                valid: validCourses.length,
                invalid: invalidCourses.length,
                invalidCourses: invalidCourses
              });
            }
            
            const termCredits = term.credits_planned || 
                               (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
            
            return (
              <Box 
                key={term.term || `term-${index}`} 
                sx={{ 
                  p: 3, 
                  border: '2px solid #e0e0e0', 
                  borderRadius: 2,
                  backgroundColor: '#fafafa',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  minHeight: '200px' // Ensure consistent height
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    Term {term.term || index + 1}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {termCredits} Credits
                  </Typography>
                </Box>
                
                {term.notes && (
                  <Box sx={{ mb: 2, p: 1, backgroundColor: '#fff3cd', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      📝 {term.notes}
                    </Typography>
                  </Box>
                )}

                {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                      📚 Courses ({term.courses.length}):
                    </Typography>
                    {/* Single column of course cards within each term */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {term.courses.map((course: Course, courseIndex: number) => {
                        const courseUniqueKey = `term-${index}-course-${courseIndex}-${course.code}`;
                        console.log(`🎨 Rendering course:`, {
                          termIndex: index,
                          courseIndex,
                          courseCode: course.code,
                          courseTitle: course.title,
                          uniqueKey: courseUniqueKey,
                          currentTerm: index + 1
                        });
                        console.log(`🔍 Rendering course ${courseIndex + 1} in term ${index + 1}:`, {
                          code: course.code,
                          title: course.title,
                          credits: course.credits,
                          fulfills: course.fulfills,
                          courseObject: course,
                          isIS400Level: course.code?.startsWith('IS 4'),
                          hasValidCode: Boolean(course.code),
                          hasValidTitle: Boolean(course.title),
                          hasValidCredits: Boolean(course.credits),
                          typeOfCredits: typeof course.credits
                        });

                        // Special logging for IS 400 level courses
                        if (course.code?.startsWith('IS 4')) {
                          console.log(`🎯 IS 400-level course detected:`, {
                            code: course.code,
                            title: course.title,
                            credits: course.credits,
                            willRender: Boolean(course.code && course.title),
                            fullCourse: JSON.stringify(course, null, 2)
                          });
                        }

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
                            border: isEditMode ? '2px solid #ffb74d' : '1px solid #ddd',
                            minHeight: '80px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: isEditMode ? 'pointer' : 'default',
                            '&:hover': isEditMode ? {
                              backgroundColor: '#fff3e0',
                              borderColor: '#ff9800',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            } : {},
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1 }}>
                              {course.code}: {course.title}
                            </Typography>
                            {isEditMode && (
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  p: 0.5,
                                  color: '#ff9800',
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
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              📖 {course.credits} credits
                            </Typography>
                            {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
                              <Typography variant="caption" color="primary" display="block">
                                ✅ {course.fulfills.join(', ')}
                              </Typography>
                            )}
                            {isEditMode && (
                              <Box sx={{ 
                                mt: 2, 
                                pt: 1, 
                                borderTop: '1px solid #ddd', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                backgroundColor: '#fff',
                                borderRadius: 1,
                                p: 1,
                                border: '1px solid #e0e0e0'
                              }}>
                                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                  📋 Move to:
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
                  <Typography variant="body2" color="text.secondary">
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
