'use client';

// @ts-nocheck - TODO: Migrate to MUI v7 Grid2 API (remove "item" props)

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  TextareaAutosize,
  Stack,
} from '@mui/material';
import { Search, AlertCircle, TrendingUp, Save } from 'lucide-react';
import { CourseValidationResults } from '@/components/scheduler/validation/CourseValidationResults';
import { CourseAnalysisResults, SectionSelection, SectionAnalysis } from '@/components/scheduler/analysis/CourseAnalysisResults';
import type { CalendarEvent } from '@/components/scheduler/test/InteractiveCalendar';

interface TestResult {
  success: boolean;
  duration: number;
  data?: unknown;
  error?: string;
}

export default function TestSchedulerToolsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Shared inputs
  const [universityId, setUniversityId] = useState('1');
  const [termName, setTermName] = useState('Winter 2026');

  // Tool 1: Validate Course Availability
  const [courseCode, setCourseCode] = useState('');
  const [courseCodesJson, setCourseCodesJson] = useState(JSON.stringify([
    "IS 455",
    "MKTG 201",
    "MATH 114"
  ], null, 2));

  // Tool 2: Analyze All Sections (combined conflicts + ranking)
  const [analyzeCoursesJson, setAnalyzeCoursesJson] = useState(JSON.stringify([
    "IS 455",
    "MKTG 201"
  ], null, 2));

  // Calendar events state for interactive calendar
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: "internship-mon",
      title: "Morning Internship",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "14:00",
      location: "Tech Company Downtown",
      category: "Work",
      backgroundColor: "#0ea5e9",
      textColor: "#ffffff"
    },
    {
      id: "internship-wed",
      title: "Morning Internship",
      dayOfWeek: 3,
      startTime: "08:00",
      endTime: "14:00",
      location: "Tech Company Downtown",
      category: "Work",
      backgroundColor: "#0ea5e9",
      textColor: "#ffffff"
    },
    {
      id: "work-1",
      title: "Part-time Job",
      dayOfWeek: 1,
      startTime: "17:00",
      endTime: "21:00",
      location: "Campus Bookstore",
      category: "Work",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff"
    },
    {
      id: "work-2",
      title: "Part-time Job",
      dayOfWeek: 3,
      startTime: "17:00",
      endTime: "21:00",
      location: "Campus Bookstore",
      category: "Work",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff"
    },
    {
      id: "work-3",
      title: "Part-time Job",
      dayOfWeek: 5,
      startTime: "17:00",
      endTime: "21:00",
      location: "Campus Bookstore",
      category: "Work",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff"
    },
    {
      id: "study-1",
      title: "Study Group - Calculus",
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "16:00",
      location: "Library Room 203",
      category: "Study",
      backgroundColor: "#10b981",
      textColor: "#ffffff"
    },
    {
      id: "study-2",
      title: "Study Group - Calculus",
      dayOfWeek: 4,
      startTime: "14:00",
      endTime: "16:00",
      location: "Library Room 203",
      category: "Study",
      backgroundColor: "#10b981",
      textColor: "#ffffff"
    },
    {
      id: "club-1",
      title: "Computer Science Club",
      dayOfWeek: 3,
      startTime: "12:00",
      endTime: "13:00",
      location: "Engineering Building 301",
      category: "Club",
      backgroundColor: "#8b5cf6",
      textColor: "#ffffff"
    },
    {
      id: "sports-1",
      title: "Intramural Basketball",
      dayOfWeek: 2,
      startTime: "19:00",
      endTime: "21:00",
      location: "Recreation Center",
      category: "Sports",
      backgroundColor: "#f59e0b",
      textColor: "#ffffff"
    },
    {
      id: "sports-2",
      title: "Intramural Basketball",
      dayOfWeek: 4,
      startTime: "19:00",
      endTime: "21:00",
      location: "Recreation Center",
      category: "Sports",
      backgroundColor: "#f59e0b",
      textColor: "#ffffff"
    },
    {
      id: "family-1",
      title: "Family Dinner",
      dayOfWeek: 6,
      startTime: "18:00",
      endTime: "20:00",
      location: "Home",
      category: "Family",
      backgroundColor: "#ec4899",
      textColor: "#ffffff"
    },
    {
      id: "other-1",
      title: "Doctor Appointment",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      location: "Student Health Center",
      category: "Other",
      backgroundColor: "#6b7280",
      textColor: "#ffffff"
    },
    {
      id: "other-2",
      title: "Tutoring Session",
      dayOfWeek: 5,
      startTime: "13:00",
      endTime: "14:30",
      location: "Math Help Center",
      category: "Study",
      backgroundColor: "#10b981",
      textColor: "#ffffff"
    },
    {
      id: "course-1",
      title: "Lab Section - Chemistry",
      dayOfWeek: 4,
      startTime: "10:00",
      endTime: "12:00",
      location: "Science Building Lab 5",
      category: "Course",
      backgroundColor: "#ef4444",
      textColor: "#ffffff"
    }
  ]);

  // Tool 3: Rank Sections
  const [sectionsJson, setSectionsJson] = useState('[]');
  const [preferences, setPreferences] = useState(JSON.stringify({
    earliest_class_time: '08:00',
    latest_class_time: '17:00',
    preferred_days: [1, 3, 5],
  }, null, 2));

  // Tool 4: Add Course Selection
  const [scheduleId, setScheduleId] = useState('');
  const [primaryOfferingId, setPrimaryOfferingId] = useState('');
  const [backup1OfferingId, setBackup1OfferingId] = useState('');
  const [backup2OfferingId, setBackup2OfferingId] = useState('');
  const [isWaitlisted, setIsWaitlisted] = useState(false);

  // Section selections for Tab 2
  const [sectionSelections, setSectionSelections] = useState<SectionSelection[]>([]);

  // Helper: Parse day abbreviations to day numbers (1=Mon, 7=Sun)
  const parseDaysToNumbers = (days: string): number[] => {
    const dayMap: Record<string, number> = {
      'M': 1,   // Monday
      'T': 2,   // Tuesday
      'W': 3,   // Wednesday
      'R': 4,   // Thursday (R to avoid conflict with T)
      'F': 5,   // Friday
      'S': 6,   // Saturday
      'U': 7,   // Sunday (U to avoid conflict with S)
    };

    const result: number[] = [];
    for (const char of days) {
      if (dayMap[char]) {
        result.push(dayMap[char]);
      }
    }
    return result;
  };

  // Helper: Parse time string like "10:00 AM - 11:00 AM" to {start, end}
  const parseTimeRange = (timeStr: string): { startTime: string; endTime: string } | null => {
    // Match patterns like "10:00 AM - 11:00 AM" or "10:00-11:00"
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;

    let [_, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match;

    // Convert to 24-hour format
    const convertTo24Hour = (hour: string, min: string, period?: string): string => {
      let h = parseInt(hour);
      const m = min;

      if (period) {
        if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
        if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      }

      return `${h.toString().padStart(2, '0')}:${m}`;
    };

    return {
      startTime: convertTo24Hour(startHour, startMin, startPeriod),
      endTime: convertTo24Hour(endHour, endMin, endPeriod || startPeriod),
    };
  };

  // Helper: Convert section to calendar events
  const sectionToCalendarEvents = (
    courseCode: string,
    section: SectionAnalysis,
    rank: 'primary' | 'backup1' | 'backup2'
  ): CalendarEvent[] => {
    if (!section.days || !section.time) return [];

    const dayNumbers = parseDaysToNumbers(section.days);
    const timeRange = parseTimeRange(section.time);

    if (!timeRange || dayNumbers.length === 0) return [];

    const rankColors = {
      primary: { bg: '#06C96C', text: '#ffffff' },
      backup1: { bg: '#3b82f6', text: '#ffffff' },
      backup2: { bg: '#f59e0b', text: '#ffffff' },
    };

    const colors = rankColors[rank];

    return dayNumbers.map(dayOfWeek => ({
      id: `${courseCode}-${section.section_label}-${rank}-${dayOfWeek}`,
      title: `${courseCode} (${section.section_label}) - ${rank === 'primary' ? 'Primary' : rank === 'backup1' ? 'Backup 1' : 'Backup 2'}`,
      dayOfWeek,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      location: section.location || '',
      category: 'Course',
      backgroundColor: colors.bg,
      textColor: colors.text,
    }));
  };

  const runTest = async (endpoint: string, body: unknown) => {
    setIsLoading(true);
    setResult(null);
    console.clear();
    console.log(`🧪 Starting ${endpoint} test...`);

    const startTime = performance.now();

    try {
      const response = await fetch(`/api/test-scheduler-tools/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          duration,
          error: data.error || 'Request failed',
        });
      } else {
        setResult({
          success: true,
          duration,
          data,
        });
      }
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      setResult({
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGetCourseOfferings = () => {
    try {
      const courseCodes = JSON.parse(courseCodesJson);
      runTest('get-course-offerings', {
        universityId: parseInt(universityId),
        termName,
        courseCodes,
      });
    } catch (error) {
      setResult({
        success: false,
        duration: 0,
        error: 'Invalid JSON in course codes',
      });
    }
  };

  const handleRemoveCourse = (courseCode: string) => {
    try {
      const courseCodes = JSON.parse(courseCodesJson);
      const updatedCodes = courseCodes.filter((code: string) => code !== courseCode);
      setCourseCodesJson(JSON.stringify(updatedCodes, null, 2));

      // Clear results so user can re-validate
      setResult(null);

      console.log(`🗑️ Removed course: ${courseCode}`);
    } catch (error) {
      console.error('Error removing course:', error);
    }
  };

  const testCheckConflicts = () => {
    try {
      const courses = JSON.parse(analyzeCoursesJson);

      // Filter out "Course" category events - we don't want sections conflicting with themselves
      const nonCourseEvents = calendarEvents.filter(event => event.category !== 'Course');

      runTest('check-conflicts', {
        universityId: parseInt(universityId),
        termName,
        courseCodes: courses,
        calendarEvents: nonCourseEvents,
        preferences: {
          earliest_class_time: '08:00',
          latest_class_time: '17:00',
          preferred_days: [1, 3, 5], // Mon, Wed, Fri
        },
      });
    } catch (error) {
      setResult({
        success: false,
        duration: 0,
        error: 'Invalid JSON in courses',
      });
    }
  };

  // Auto-trigger analysis when calendar events change (only when on Tab 2 and we have a previous result)
  const previousCalendarRef = useRef<string>('');
  useEffect(() => {
    // Only auto-trigger if we're on Tab 2 and we've run analysis at least once
    if (currentTab !== 1 || !result) return;

    const newCalendarStr = JSON.stringify(calendarEvents);
    if (newCalendarStr !== previousCalendarRef.current && previousCalendarRef.current !== '') {
      console.log('📅 Calendar events changed, auto-triggering analysis...');
      previousCalendarRef.current = newCalendarStr;
      testCheckConflicts();
    } else if (previousCalendarRef.current === '') {
      previousCalendarRef.current = newCalendarStr;
    }
  }, [calendarEvents, currentTab, result]);

  const testRankSections = () => {
    try {
      const sections = JSON.parse(sectionsJson);
      const prefs = JSON.parse(preferences);
      runTest('rank-sections', {
        sections,
        preferences: prefs,
      });
    } catch (error) {
      setResult({
        success: false,
        duration: 0,
        error: 'Invalid JSON in sections or preferences',
      });
    }
  };

  const testAddSelection = async () => {
    // Group selections by course
    const courseGroups = Array.from(new Set(sectionSelections.map(s => s.courseCode))).map(courseCode => {
      const courseSelections = sectionSelections.filter(s => s.courseCode === courseCode);
      const primary = courseSelections.find(s => s.rank === 'primary');
      const backup1 = courseSelections.find(s => s.rank === 'backup1');
      const backup2 = courseSelections.find(s => s.rank === 'backup2');

      return {
        courseCode,
        primarySection: primary?.sectionLabel,
        backup1Section: backup1?.sectionLabel,
        backup2Section: backup2?.sectionLabel,
      };
    }).filter(g => g.primarySection); // Only courses with primary selection

    console.log('📦 Selections to save:', courseGroups);

    // For now, we'll save the JSON structure
    // TODO: We need to look up offering IDs from the database based on:
    // - universityId, termName, courseCode, sectionLabel
    // Then call the add-selection API for each course

    setResult({
      success: true,
      duration: 0,
      data: {
        message: 'Selection structure ready (offering ID lookup not implemented yet)',
        scheduleId,
        selections: courseGroups,
        nextSteps: [
          '1. Query database to get offering IDs for each section',
          '2. Call POST /api/test-scheduler-tools/add-selection for each course',
          '3. Handle any errors (section not found, etc.)',
        ],
      },
    });
  };

  // Handler: Select a section and add to calendar
  const handleSelectSection = (courseCode: string, sectionLabel: string, rank: 'primary' | 'backup1' | 'backup2') => {
    // Find the section data from the current result
    if (!result || !result.success || !(result.data as any).analyses) return;

    const analyses = (result.data as any).analyses;
    const courseAnalysis = analyses.find((a: any) => a.courseCode === courseCode);
    if (!courseAnalysis) return;

    const section = courseAnalysis.sections.find((s: SectionAnalysis) => s.section_label === sectionLabel);
    if (!section) return;

    // Add to selections
    const newSelection: SectionSelection = {
      courseCode,
      sectionLabel,
      rank,
    };
    setSectionSelections([...sectionSelections, newSelection]);

    // Convert section to calendar events and add them
    const newEvents = sectionToCalendarEvents(courseCode, section, rank);
    setCalendarEvents([...calendarEvents, ...newEvents]);

    console.log(`✅ Added ${courseCode} Section ${sectionLabel} as ${rank}`);
  };

  // Handler: Deselect a section and remove from calendar
  const handleDeselectSection = (courseCode: string, sectionLabel: string) => {
    // Remove from selections
    const selection = sectionSelections.find(s => s.courseCode === courseCode && s.sectionLabel === sectionLabel);
    if (!selection) return;

    setSectionSelections(sectionSelections.filter(s => !(s.courseCode === courseCode && s.sectionLabel === sectionLabel)));

    // Remove calendar events for this section
    const eventIdPrefix = `${courseCode}-${sectionLabel}-${selection.rank}`;
    setCalendarEvents(calendarEvents.filter(event => !event.id.startsWith(eventIdPrefix)));

    console.log(`🗑️ Removed ${courseCode} Section ${sectionLabel}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          🧪 Scheduler Tools Test Page
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Test course selection tools independently. Check browser console (F12) for detailed logs.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 2, mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => {
            setCurrentTab(newValue);
            setResult(null);
            // Clear selections when switching tabs
            if (newValue !== 1) {
              setSectionSelections([]);
              // Remove course events from calendar
              setCalendarEvents(calendarEvents.filter(e => e.category !== 'Course'));
            }
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="1. Validate Courses" />
          <Tab label="2. Analyze Sections" />
          <Tab label="3. Save Selection" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 1: Validate Course Availability */}
          {currentTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <Search size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Validate Course Availability
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Check if courses are available in the target term. For courses not available, suggests alternative terms.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <TextField
                  label="University ID"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Term Name"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Course Codes (JSON Array)
                  </Typography>
                  <TextField
                    value={courseCodesJson}
                    onChange={(e) => setCourseCodesJson(e.target.value)}
                    fullWidth
                    multiline
                    rows={6}
                    placeholder='["IS 455", "CS 450", "MATH 221"]'
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Box>
              </Box>

              <Button
                variant="contained"
                onClick={testGetCourseOfferings}
                disabled={isLoading}
                startIcon={<Search size={18} />}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                {isLoading ? 'Testing...' : 'Validate Courses'}
              </Button>
            </Box>
          )}

          {/* Tab 2: Analyze All Sections */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <TrendingUp size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Analyze All Sections
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Analyze all sections for multiple courses - checks conflicts AND ranks by preferences. Analysis re-runs automatically when selections change.
              </Typography>

              {/* Configuration Row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <TextField
                  label="University ID"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Term Name"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={testCheckConflicts}
                  disabled={isLoading}
                  startIcon={<TrendingUp size={18} />}
                  sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' }, height: '40px' }}
                  fullWidth
                >
                  {isLoading ? 'Analyzing...' : 'Analyze Sections'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSectionSelections([]);
                    setCalendarEvents(calendarEvents.filter(e => e.category !== 'Course'));
                    console.log('🗑️ Cleared all section selections');
                  }}
                  disabled={sectionSelections.length === 0}
                  sx={{ height: '40px' }}
                  fullWidth
                >
                  Clear Selections ({sectionSelections.length})
                </Button>
              </Box>

              {/* Course Codes Input */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  Course Codes (JSON Array)
                </Typography>
                <TextField
                  value={analyzeCoursesJson}
                  onChange={(e) => setAnalyzeCoursesJson(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder='["IS 455", "CS 450"]'
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </Box>

              {/* Analysis Results */}
              <Box>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                  📊 Section Analysis Results
                </Typography>
                {result && result.success && (result.data as any).analyses ? (
                  <CourseAnalysisResults
                    analyses={(result.data as any).analyses}
                    compact
                    selections={sectionSelections}
                    onSelectSection={handleSelectSection}
                    onDeselectSection={handleDeselectSection}
                  />
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      border: '1px dashed var(--border)',
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Click "Analyze Sections" to see results here. Results will update automatically when selections change.
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          )}

          {/* Tab 3: Save Selections */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <Save size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Save Course Selections
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Save your selected sections from Tab 2 to the database. All courses with at least a primary selection will be saved.
              </Typography>

              {/* Display Current Selections */}
              {sectionSelections.length > 0 ? (
                <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Current Selections from Tab 2:
                  </Typography>
                  <Stack spacing={1.5}>
                    {Array.from(new Set(sectionSelections.map(s => s.courseCode))).map(courseCode => {
                      const courseSelections = sectionSelections.filter(s => s.courseCode === courseCode);
                      const primary = courseSelections.find(s => s.rank === 'primary');
                      const backup1 = courseSelections.find(s => s.rank === 'backup1');
                      const backup2 = courseSelections.find(s => s.rank === 'backup2');

                      return (
                        <Box key={courseCode} sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {courseCode}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {primary && (
                              <Chip
                                label={`Primary: ${primary.sectionLabel}`}
                                size="small"
                                sx={{ bgcolor: '#06C96C', color: '#fff' }}
                              />
                            )}
                            {backup1 && (
                              <Chip
                                label={`Backup 1: ${backup1.sectionLabel}`}
                                size="small"
                                sx={{ bgcolor: '#3b82f6', color: '#fff' }}
                              />
                            )}
                            {backup2 && (
                              <Chip
                                label={`Backup 2: ${backup2.sectionLabel}`}
                                size="small"
                                sx={{ bgcolor: '#f59e0b', color: '#fff' }}
                              />
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Card>
              ) : (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    No selections yet. Go to Tab 2 and select sections for your courses first.
                  </Typography>
                </Alert>
              )}

              {/* Schedule ID Input */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Schedule ID (UUID)"
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="abc123-456d-789e-..."
                  helperText="The schedule ID to save these selections to"
                />
              </Box>

              {/* Save Button */}
              <Button
                variant="contained"
                onClick={testAddSelection}
                disabled={isLoading || !scheduleId || sectionSelections.length === 0}
                startIcon={<Save size={18} />}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                {isLoading ? 'Saving...' : `Save ${Array.from(new Set(sectionSelections.map(s => s.courseCode))).length} Course(s)`}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Note: This will save all courses that have at least a primary selection. Offering IDs will be looked up automatically based on course code, term, and section label.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Results Section - Only show for Tab 0 and Tab 2, Tab 1 displays inline */}
      {result && currentTab !== 1 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: `2px solid ${result.success ? '#10b981' : '#ef4444'}`,
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {result.success ? '✅ Success' : '❌ Failed'}
            </Typography>
            <Chip label={`${result.duration}ms`} size="small" />
          </Box>

          {result.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Error:
              </Typography>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                {result.error}
              </Typography>
            </Alert>
          )}

          {result.success && result.data ? (
            <Box>
              {/* Tab 0: Validate Courses - Use specialized component */}
              {currentTab === 0 && (result.data as any).summary && (result.data as any).results ? (
                <Box sx={{ mb: 3 }}>
                  <CourseValidationResults
                    summary={(result.data as any).summary}
                    results={(result.data as any).results}
                    onRemoveCourse={handleRemoveCourse}
                  />
                </Box>
              ) : null}

              {/* Default: Show raw JSON for other tabs or if specialized data not present */}
              {(currentTab === 0 && (!(result.data as any).summary || !(result.data as any).results)) ||
              (currentTab !== 0 && currentTab !== 1) ? (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                    Result:
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', overflow: 'auto', maxHeight: '400px' }}>
                        {JSON.stringify(result.data, null, 2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              ) : null}
            </Box>
          ) : null}

          <Divider sx={{ my: 2 }} />

          <Alert severity="info">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              💡 Check Browser Console (F12)
            </Typography>
            <Typography variant="body2">
              Detailed logs with emojis show the full execution flow, database queries, and any issues.
            </Typography>
          </Alert>
        </Paper>
      )}
    </Container>
  );
}
