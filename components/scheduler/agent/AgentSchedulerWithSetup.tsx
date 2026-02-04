'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  LinearProgress,
  Alert,
  Divider,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { CourseSelectionOrchestrator } from '@/lib/mastra/courseSelectionOrchestrator';
import { SectionSelectionCard } from './SectionSelectionCard';
import type {
  CourseSelectionSessionInput,
  AgentMessageContent,
  CourseSectionWithMeetings,
  SchedulerEvent,
} from '@/lib/mastra/types';
import type { SchedulePreferences } from '@/lib/services/scheduleService';
import type { GradPlanDetails } from '@/lib/utils/gradPlanHelpers';

interface AgentSchedulerWithSetupProps {
  termName: string;
  termIndex: number;
  universityId: number;
  studentId: number;
  scheduleId: string;
  gradPlanDetails: GradPlanDetails | null;
  gradPlanId?: string;
  existingPersonalEvents: Array<{
    id: string;
    title: string;
    category: 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Other';
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
  existingPreferences: SchedulePreferences;
  onComplete?: () => void;
  onCalendarUpdate?: (events: SchedulerEvent[]) => void;
}

/**
 * AgentSchedulerWithSetup - AI-guided course selection interface
 *
 * This component orchestrates the conversational flow for selecting courses.
 * It uses the CourseSelectionOrchestrator to manage state and the SectionSelectionCard
 * to display section options.
 */
export function AgentSchedulerWithSetup({
  termName,
  termIndex,
  universityId,
  studentId,
  scheduleId,
  gradPlanDetails,
  gradPlanId,
  existingPersonalEvents,
  existingPreferences,
  onComplete,
  onCalendarUpdate,
}: AgentSchedulerWithSetupProps) {
  // State
  const [orchestrator, setOrchestrator] = useState<CourseSelectionOrchestrator | null>(null);
  const [currentMessage, setCurrentMessage] = useState<AgentMessageContent | null>(null);
  const [messageHistory, setMessageHistory] = useState<Array<{ type: 'agent' | 'user'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract courses from grad plan
  const extractCoursesFromGradPlan = useCallback((): string[] => {
    if (!gradPlanDetails || !gradPlanDetails.plan) {
      return [];
    }

    // Find the term in the grad plan
    const term = gradPlanDetails.plan.find(
      (item) => 'term' in item && item.term === termName && !item.termPassed
    );

    if (!term || !('courses' in term) || !term.courses) {
      return [];
    }

    // Extract course codes from the term
    return term.courses
      .filter((course) => course && typeof course === 'object' && 'code' in course)
      .map((course) => (course as { code: string }).code);
  }, [gradPlanDetails, termName]);

  // Initialize orchestrator when user clicks "Start"
  const initializeOrchestrator = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHasStarted(true);

      const courseCodes = extractCoursesFromGradPlan();

      if (courseCodes.length === 0) {
        setError('No courses found in your graduation plan for this term.');
        setIsLoading(false);
        return;
      }

      // Convert existing events to SchedulerEvent format
      const calendarEvents: SchedulerEvent[] = existingPersonalEvents.map((evt) => ({
        id: evt.id,
        title: evt.title,
        dayOfWeek: evt.day_of_week === 7 ? 0 : evt.day_of_week,
        startTime: evt.start_time,
        endTime: evt.end_time,
        category: evt.category,
      }));

      // Create session input
      const sessionInput: CourseSelectionSessionInput = {
        scheduleId,
        studentId,
        universityId,
        termName,
        gradPlanCourses: courseCodes,
        existingCalendar: calendarEvents,
        preferences: existingPreferences,
      };

      // Create and start orchestrator
      const newOrchestrator = new CourseSelectionOrchestrator(sessionInput);
      const welcomeMessage = await newOrchestrator.start();

      setOrchestrator(newOrchestrator);
      setCurrentMessage(welcomeMessage);
      setMessageHistory([{ type: 'agent', content: welcomeMessage.text }]);
    } catch (err) {
      console.error('Failed to initialize orchestrator:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize course selection');
    } finally {
      setIsLoading(false);
    }
  }, [
    scheduleId,
    studentId,
    universityId,
    termName,
    existingPersonalEvents,
    existingPreferences,
    extractCoursesFromGradPlan,
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessage, messageHistory]);

  // Update parent calendar when orchestrator state changes
  useEffect(() => {
    if (orchestrator && onCalendarUpdate) {
      const events = orchestrator.getCalendarEvents();
      onCalendarUpdate(events);
    }
  }, [orchestrator, currentMessage, onCalendarUpdate]);

  // Handle user input
  const handleUserInput = async (input: string | { sectionId?: number; action?: string }) => {
    if (!orchestrator) return;

    try {
      setIsLoading(true);
      setError(null);

      // Add user message to history
      const userText = typeof input === 'string' ? input : input.action || 'Selected section';
      setMessageHistory((prev) => [...prev, { type: 'user', content: userText }]);

      // Process input
      const response = await orchestrator.processUserInput(input);

      // Add agent response to history
      setMessageHistory((prev) => [...prev, { type: 'agent', content: response.text }]);
      setCurrentMessage(response);

      // Check if session is complete
      const state = orchestrator.getState();
      if (state.currentCourseIndex >= state.totalCourses) {
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    } catch (err) {
      console.error('Error processing user input:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle section selection
  const handleSectionSelect = (section: CourseSectionWithMeetings) => {
    handleUserInput({ sectionId: section.offering_id });
  };

  // Handle restart
  const handleRestart = () => {
    if (orchestrator) {
      orchestrator.reset();
      setMessageHistory([]);
      setIsComplete(false);
      handleUserInput('start');
    }
  };

  // Render welcome screen (before starting)
  if (!hasStarted) {
    const courseCodes = extractCoursesFromGradPlan();

    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'var(--primary-15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            mb: 3,
          }}
        >
          <Typography variant="h2" sx={{ fontSize: '3rem' }}>
            🤖
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          AI Course Scheduler
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          I'll help you select the best sections for your {termName} courses based on your preferences and schedule.
        </Typography>

        {courseCodes.length > 0 ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Courses to Schedule ({courseCodes.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {courseCodes.map((code) => (
                  <Chip key={code} label={code} size="small" />
                ))}
              </Box>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={initializeOrchestrator}
              disabled={isLoading}
              sx={{ px: 4 }}
            >
              {isLoading ? 'Starting...' : "Let's Go! 🚀"}
            </Button>
          </>
        ) : (
          <Alert severity="warning" sx={{ maxWidth: 360, mx: 'auto' }}>
            No courses found in your graduation plan for {termName}.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 360, mx: 'auto' }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  }

  // Render loading state
  if (isLoading && !orchestrator) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Initializing course selection...
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (error && !orchestrator) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!orchestrator) {
    return null;
  }

  const state = orchestrator.getState();
  const progressPercent = (state.currentCourseIndex / state.totalCourses) * 100;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header with Progress */}
      <Box sx={{ p: 2, borderBottom: '1px solid var(--border)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            AI Course Scheduler
          </Typography>
          <IconButton size="small" onClick={handleRestart} disabled={isLoading}>
            <RestartAltIcon />
          </IconButton>
        </Box>

        {/* Progress indicator */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {orchestrator.getProgressIndicator()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {state.coursesCompleted.length}/{state.totalCourses}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 6, borderRadius: 3 }} />
        </Box>

        {/* Completed courses chip */}
        {state.coursesCompleted.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            {state.coursesCompleted.slice(-3).map((code) => (
              <Chip
                key={code}
                label={code}
                size="small"
                icon={<CheckCircleIcon />}
                color="success"
                variant="outlined"
              />
            ))}
            {state.coursesCompleted.length > 3 && (
              <Chip label={`+${state.coursesCompleted.length - 3} more`} size="small" variant="outlined" />
            )}
          </Box>
        )}
      </Box>

      {/* Message History Toggle */}
      {messageHistory.length > 2 && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid var(--border)' }}>
          <Button
            size="small"
            onClick={() => setShowHistory(!showHistory)}
            endIcon={showHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ textTransform: 'none' }}
          >
            {showHistory ? 'Hide' : 'Show'} conversation history ({messageHistory.length - 1} messages)
          </Button>
        </Box>
      )}

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Message History (collapsed by default) */}
        <Collapse in={showHistory}>
          <Stack spacing={2} sx={{ mb: 2 }}>
            {messageHistory.slice(0, -1).map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  alignSelf: msg.type === 'agent' ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: msg.type === 'agent' ? 'var(--surface)' : 'var(--primary-15)',
                    border: '1px solid var(--border)',
                    opacity: 0.6,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ mb: 2 }} />
        </Collapse>

        {/* Current Message */}
        {currentMessage && (
          <Box>
            {/* Agent message */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'var(--surface)',
                border: '1px solid var(--border)',
                mb: 2,
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: currentMessage.prompt ? 1 : 0 }}>
                {currentMessage.text}
              </Typography>
              {currentMessage.prompt && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {currentMessage.prompt}
                </Typography>
              )}
            </Paper>

            {/* Action buttons (for simple yes/no or start) */}
            {currentMessage.options && currentMessage.options.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {currentMessage.options.map((option) => (
                  <Button
                    key={option.value}
                    variant={option.value === 'start' ? 'contained' : 'outlined'}
                    onClick={() => handleUserInput(option.value)}
                    disabled={isLoading}
                  >
                    {option.label}
                  </Button>
                ))}
              </Stack>
            )}

            {/* Section selection cards */}
            {state.currentCourse && state.currentCourse.rankedSections && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Available Sections for {state.currentCourse.code}
                </Typography>
                <Stack spacing={2}>
                  {state.currentCourse.rankedSections.slice(0, 5).map((ranked) => (
                    <SectionSelectionCard
                      key={ranked.section.offering_id}
                      section={ranked.section}
                      ranking={ranked}
                      onSelect={handleSectionSelect}
                      disabled={isLoading}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <LinearProgress sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Processing...
            </Typography>
          </Box>
        )}

        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Completion message */}
        {isComplete && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Schedule Complete! 🎉
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You've successfully scheduled {state.coursesCompleted.length} courses for {termName}.
            </Typography>
            <Button variant="outlined" onClick={handleRestart} startIcon={<RestartAltIcon />}>
              Start Over
            </Button>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
}
