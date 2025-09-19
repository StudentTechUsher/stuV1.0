'use client';

import * as React from 'react';
import { Box, Typography, Button, TextField, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

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

interface GradPlanViewerProps {
  planDetails: unknown;
  studentName: string;
  onSuggestionsChange?: (hasSuggestions: boolean, suggestions: Record<string, string>) => void;
}

export default function GradPlanViewer({ planDetails, studentName, onSuggestionsChange }: GradPlanViewerProps) {
  // State for managing suggestion text fields
  const [activeSuggestions, setActiveSuggestions] = React.useState<Record<string, string>>({});
  
  // Notify parent component when suggestions change
  React.useEffect(() => {
    const hasSuggestions = Object.keys(activeSuggestions).length > 0;
    onSuggestionsChange?.(hasSuggestions, activeSuggestions);
  }, [activeSuggestions, onSuggestionsChange]);

  const handleAddSuggestion = (termKey: string) => {
    setActiveSuggestions(prev => ({
      ...prev,
      [termKey]: ''
    }));
  };

  const handleRemoveSuggestion = (termKey: string) => {
    setActiveSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[termKey];
      return newSuggestions;
    });
  };

  const handleSuggestionChange = (termKey: string, value: string) => {
    setActiveSuggestions(prev => ({
      ...prev,
      [termKey]: value
    }));
  };
  // Helper functions for parsing plan data
  const parseObjectData = (obj: Record<string, unknown>): Term[] => {
    // Check for plan property first (most common format)
    if (obj.plan && Array.isArray(obj.plan)) {
      return obj.plan as Term[];
    }
    
    if (obj.semesters && Array.isArray(obj.semesters)) {
      return obj.semesters as Term[];
    }
    
    if (obj.terms && Array.isArray(obj.terms)) {
      return obj.terms as Term[];
    }
    
    // If it's an object with term keys like "term1", "term2", etc.
    const termKeys = Object.keys(obj).filter(key => 
      key.toLowerCase().includes('term') || key.toLowerCase().includes('semester')
    );
    if (termKeys.length > 0) {
      return termKeys.map(key => obj[key] as Term).filter(Boolean);
    }
    
    return [];
  };

  const parseStringData = (data: string): Term[] => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed as Term[];
      }
      // If it's an object, try to parse it like parseObjectData
      if (typeof parsed === 'object' && parsed !== null) {
        return parseObjectData(parsed as Record<string, unknown>);
      }
    } catch (error) {
      console.error('Error parsing JSON string:', error);
    }
    return [];
  };

  // Parse the plan details
  const parsePlanData = (): Term[] => {
    if (!planDetails) return [];
    
    // Handle different possible formats
    if (Array.isArray(planDetails)) {
      return planDetails as Term[];
    }
    
    if (typeof planDetails === 'object' && planDetails !== null) {
      return parseObjectData(planDetails as Record<string, unknown>);
    }
    
    if (typeof planDetails === 'string') {
      return parseStringData(planDetails);
    }
    
    return [];
  };

  const planData = parsePlanData();
  
  // Calculate total credits
  const totalCredits = planData.reduce((total, term) => {
    const termCredits = term.credits_planned || 
                       (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
    return total + termCredits;
  }, 0);

  if (!planData || planData.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No graduation plan data to display, or the data format is not recognized.
        </Typography>
        <Box sx={{ 
          backgroundColor: '#f8f9fa', 
          p: 2, 
          borderRadius: 1, 
          border: '1px solid #e9ecef',
          maxHeight: 200,
          overflow: 'auto'
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            Raw data:
          </Typography>
          <pre style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#666' }}>
            {JSON.stringify(planDetails, null, 2)}
          </pre>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Graduation Plan for {studentName}
      </Typography>
      
      {/* Plan Summary */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          px: 2,
          py: 1,
          backgroundColor: '#e3f2fd',
          borderRadius: 1,
          border: '1px solid #90caf9'
        }}>
          📚 {planData.length} terms planned
        </Typography>
        <Typography variant="body2" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          px: 2,
          py: 1,
          backgroundColor: '#e8f5e8',
          borderRadius: 1,
          border: '1px solid #81c784'
        }}>
          📊 {totalCredits} total credits
        </Typography>
        <Typography variant="body2" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          px: 2,
          py: 1,
          backgroundColor: '#fff3e0',
          borderRadius: 1,
          border: '1px solid #ffb74d'
        }}>
          ⏱️ {Math.ceil(planData.length / 2)} years
        </Typography>
      </Box>

      {/* Terms Grid */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: 3,
        '@media (max-width: 600px)': {
          gridTemplateColumns: '1fr'
        }
      }}>
        {planData.map((term, index) => {            
          const termCredits = term.credits_planned || 
                             (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
          
          const termKey = term.term || `term-${index}`;
          const hasSuggestion = activeSuggestions.hasOwnProperty(termKey);
          
          return (
            <Box 
              key={termKey} 
              sx={{ 
                p: 3, 
                border: '2px solid #e0e0e0', 
                borderRadius: 2,
                backgroundColor: '#fafafa',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                minHeight: '200px'
              }}
            >
              {/* Term Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                  {term.term ? `Term ${term.term}` : `Term ${index + 1}`}
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976d2',
                  px: 2,
                  py: 0.5,
                  backgroundColor: '#e3f2fd',
                  borderRadius: 1,
                  border: '1px solid #90caf9'
                }}>
                  {termCredits} Credits
                </Typography>
              </Box>
              
              {/* Term Notes */}
              {term.notes && (
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
                  <Typography variant="body2" color="text.secondary">
                    📝 {term.notes}
                  </Typography>
                </Box>
              )}

              {/* Courses */}
              {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#666' }}>
                    📚 Courses ({term.courses.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {term.courses.map((course: Course, courseIndex: number) => (
                      <Box 
                        key={`${course.code}-${courseIndex}`} 
                        sx={{ 
                          p: 2, 
                          backgroundColor: 'white', 
                          borderRadius: 1, 
                          border: '1px solid #ddd',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'box-shadow 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                          }
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>
                          {course.code}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, color: '#555' }}>
                          {course.title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ 
                            color: '#666',
                            px: 1,
                            py: 0.5,
                            backgroundColor: '#f5f5f5',
                            borderRadius: 0.5,
                            fontWeight: 500
                          }}>
                            📖 {course.credits} credit{course.credits !== 1 ? 's' : ''}
                          </Typography>
                          {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
                            <Typography variant="caption" sx={{ 
                              color: '#2e7d32',
                              px: 1,
                              py: 0.5,
                              backgroundColor: '#e8f5e8',
                              borderRadius: 0.5,
                              fontWeight: 500
                            }}>
                              ✅ {course.fulfills.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No courses defined for this term
                </Typography>
              )}

              {/* Suggestion Section */}
              <Box sx={{ 
                mt: 3, 
                borderTop: '1px solid #e0e0e0', 
                pt: 2,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start'
              }}>
                {hasSuggestion ? (
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#666' }}>
                        💡 Suggestion for this term:
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveSuggestion(termKey)}
                        sx={{ color: '#f44336' }}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Enter your suggestion for improving this term..."
                      value={activeSuggestions[termKey] || ''}
                      onChange={(e) => handleSuggestionChange(termKey, e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => handleAddSuggestion(termKey)}
                    sx={{
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      alignSelf: 'flex-end',
                      '&:hover': {
                        backgroundColor: '#e3f2fd',
                        borderColor: '#1565c0'
                      }
                    }}
                  >
                    Suggest Edit
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}