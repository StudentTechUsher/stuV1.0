'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
  studentProfile?: {
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  };
}

export default function GraduationPlanner({ plan }: Readonly<GraduationPlannerProps>) {
  console.log('🎓 GraduationPlanner received plan:', plan);
  console.log('🎓 Plan structure:', JSON.stringify(plan, null, 2));

  if (!plan) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="error">
          No graduation plan provided
        </Typography>
      </Box>
    );
  }

  // Handle different possible database structures
  let planData: Term[] = [];
  const planRecord = plan as Record<string, unknown>;
  
  // Check for the actual database structure: plan_details.plan
  if (planRecord.plan_details && 
      typeof planRecord.plan_details === 'object' && 
      planRecord.plan_details !== null) {
    const planDetails = planRecord.plan_details as Record<string, unknown>;
    if (Array.isArray(planDetails.plan)) {
      planData = planDetails.plan as Term[];
      console.log('✅ Found plan_details.plan array with', planData.length, 'terms');
    }
  }
  // Check if plan has a 'plan' property (nested structure)
  else if (Array.isArray(planRecord.plan)) {
    planData = planRecord.plan as Term[];
    console.log('✅ Found plan.plan array with', planData.length, 'terms');
  }
  // Check if plan itself is an array of terms
  else if (Array.isArray(plan)) {
    planData = plan;
    console.log('✅ Plan is directly an array with', planData.length, 'terms');
  }

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

  // Extract additional info from plan_details if available
  const planDetails = (planRecord.plan_details as Record<string, unknown>) || {};
  const programName = planDetails.program as string;
  const assumptions = planDetails.assumptions as string[];
  const durationYears = planDetails.duration_years as number;

  return (
    <Box sx={{ p: 2 }}>
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
          📚 {planData.length} terms planned
        </Typography>
        {Boolean(durationYears) && (
          <Typography variant="body1">
            ⏱️ {durationYears} years
          </Typography>
        )}
        <Typography variant="body1">
          📊 Total Credits: {planData.reduce((total, term) => {
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
        {planData.map((term, index) => {
          console.log(`📚 Processing term ${index + 1}:`, term);
          
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 1 }}>
                    {term.courses.map((course: Course, courseIndex: number) => (
                      <Box 
                        key={`${course.code}-${courseIndex}`} 
                        sx={{ 
                          p: 2, 
                          backgroundColor: 'white', 
                          borderRadius: 1, 
                          border: '1px solid #ddd',
                          minHeight: '80px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {course.code}: {course.title}
                        </Typography>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            📖 {course.credits} credits
                          </Typography>
                          {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
                            <Typography variant="caption" color="primary" display="block">
                              ✅ {course.fulfills.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
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
  );
}
