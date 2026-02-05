'use client';

import { useState } from 'react';
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
  Grid,
  Chip,
  Divider,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  TextareaAutosize,
} from '@mui/material';
import { Search, AlertCircle, TrendingUp, Save } from 'lucide-react';

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

  // Tool 1: Get Course Offerings
  const [courseCode, setCourseCode] = useState('');

  // Tool 2: Check Section Conflicts
  const [sectionId, setSectionId] = useState('');
  const [calendarEvents, setCalendarEvents] = useState('[]');

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
    runTest('get-course-offerings', {
      universityId: parseInt(universityId),
      termName,
      courseCode,
    });
  };

  const testCheckConflicts = () => {
    try {
      const events = JSON.parse(calendarEvents);
      runTest('check-conflicts', {
        universityId: parseInt(universityId),
        termName,
        courseCode,
        sectionId: parseInt(sectionId),
        calendarEvents: events,
      });
    } catch (error) {
      setResult({
        success: false,
        duration: 0,
        error: 'Invalid JSON in calendar events',
      });
    }
  };

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

  const testAddSelection = () => {
    runTest('add-selection', {
      scheduleId,
      courseCode,
      primaryOfferingId: parseInt(primaryOfferingId),
      backup1OfferingId: backup1OfferingId ? parseInt(backup1OfferingId) : null,
      backup2OfferingId: backup2OfferingId ? parseInt(backup2OfferingId) : null,
      isWaitlisted,
    });
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
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="1. Get Offerings" />
          <Tab label="2. Check Conflicts" />
          <Tab label="3. Rank Sections" />
          <Tab label="4. Save Selection" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 1: Get Course Offerings */}
          {currentTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <Search size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Get Course Offerings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Fetch all available sections for a course in a given term.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="University ID"
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Term Name"
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Course Code"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    fullWidth
                    size="small"
                    placeholder="CS 450"
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={testGetCourseOfferings}
                disabled={isLoading || !courseCode}
                startIcon={<Search size={18} />}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                {isLoading ? 'Testing...' : 'Test Course Fetch'}
              </Button>
            </Box>
          )}

          {/* Tab 2: Check Section Conflicts */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Check Section Conflicts
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Check if a section has time conflicts with existing calendar events.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="University ID"
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Term Name"
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Course Code"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    fullWidth
                    size="small"
                    placeholder="CS 450"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Section Label"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="001 or 1"
                    helperText="e.g., 001, 002, or 1"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Existing Calendar Events (JSON)
                  </Typography>
                  <TextField
                    value={calendarEvents}
                    onChange={(e) => setCalendarEvents(e.target.value)}
                    fullWidth
                    multiline
                    rows={6}
                    placeholder='[{"id":"1","title":"Work","dayOfWeek":2,"startTime":"09:00","endTime":"12:00"}]'
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={testCheckConflicts}
                disabled={isLoading || !courseCode || !sectionId}
                startIcon={<AlertCircle size={18} />}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                {isLoading ? 'Testing...' : 'Check Conflicts'}
              </Button>
            </Box>
          )}

          {/* Tab 3: Rank Sections */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <TrendingUp size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Rank Sections by Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Rank course sections based on user preferences (time, days, etc.).
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Sections (JSON Array)
                  </Typography>
                  <TextField
                    value={sectionsJson}
                    onChange={(e) => setSectionsJson(e.target.value)}
                    fullWidth
                    multiline
                    rows={10}
                    placeholder='[{"offering_id":1,"section_label":"001","meetings_json":{"days":"MWF","start":"09:00","end":"10:30"}}]'
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Preferences (JSON Object)
                  </Typography>
                  <TextField
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    fullWidth
                    multiline
                    rows={10}
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={testRankSections}
                disabled={isLoading}
                startIcon={<TrendingUp size={18} />}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                {isLoading ? 'Testing...' : 'Rank Sections'}
              </Button>
            </Box>
          )}

          {/* Tab 4: Add Course Selection */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <Save size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Save Course Selection
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Save a course selection (primary + backups) to the database.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Schedule ID (UUID)"
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="abc123-..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Course Code"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    fullWidth
                    size="small"
                    placeholder="CS 450"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Primary Offering ID"
                    value={primaryOfferingId}
                    onChange={(e) => setPrimaryOfferingId(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="12345"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Backup 1 Offering ID"
                    value={backup1OfferingId}
                    onChange={(e) => setBackup1OfferingId(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="12346 (optional)"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Backup 2 Offering ID"
                    value={backup2OfferingId}
                    onChange={(e) => setBackup2OfferingId(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="12347 (optional)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isWaitlisted}
                        onChange={(e) => setIsWaitlisted(e.target.checked)}
                      />
                    }
                    label="Is Waitlisted"
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={testAddSelection}
                disabled={isLoading || !scheduleId || !courseCode || !primaryOfferingId}
                startIcon={<Save size={18} />}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                {isLoading ? 'Testing...' : 'Save Selection'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Results Section */}
      {result && (
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

          {result.success && result.data && (
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
          )}

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
