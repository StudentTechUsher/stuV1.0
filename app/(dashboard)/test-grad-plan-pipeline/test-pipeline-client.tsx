/**
 * Test Grad Plan Pipeline - Client Component
 *
 * Interactive test interface for the graduation plan orchestration layer.
 * Provides tabs for testing pipeline overview, step inspection, state viewing,
 * and full pipeline runs.
 */

'use client';

import { useState, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { Box, Tabs, Tab, Typography, Paper, Button, Alert } from '@mui/material';
import { useGradPlanOrchestration, type StudentProfile } from '@/lib/hooks/useGradPlanOrchestration';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';
import { createMockPipelineData, createMockToolResult } from '@/lib/chatbot/grad-plan/mockData';
import ToolRenderer, { type ToolType } from '@/components/chatbot-tools/ToolRenderer';

interface TestPipelineClientProps {
  user: User;
  studentProfile: StudentProfile;
  hasCourses: boolean;
  hasActivePlan: boolean;
  academicTerms: AcademicTermsConfig;
}

type TabValue = 'overview' | 'inspector' | 'state' | 'full-run';

export default function TestPipelineClient({
  user,
  studentProfile,
  hasCourses,
  hasActivePlan,
  academicTerms,
}: Readonly<TestPipelineClientProps>) {
  const [currentTab, setCurrentTab] = useState<TabValue>('overview');
  const [selectedStep, setSelectedStep] = useState<ConversationStep | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);

  // Initialize orchestration hook in mock mode
  const orchestration = useGradPlanOrchestration({
    user,
    studentProfile,
    hasCourses,
    hasActivePlan,
    academicTerms,
    mockMode: true,
    executeSideEffects: false,
  });

  const {
    conversationState,
    messages,
    activeTool,
    activeToolData,
    isProcessing,
    agentChecks,
    handleToolComplete,
    injectState,
    injectToolResult,
  } = orchestration;

  // All pipeline steps
  const allSteps: ConversationStep[] = [
    ConversationStep.INITIALIZE,
    ConversationStep.PROFILE_CHECK,
    ConversationStep.TRANSCRIPT_CHECK,
    ConversationStep.PROGRAM_SELECTION,
    ConversationStep.COURSE_METHOD,
    ConversationStep.COURSE_SELECTION,
    ConversationStep.CREDIT_DISTRIBUTION,
    ConversationStep.MILESTONES_AND_CONSTRAINTS,
    ConversationStep.GENERATING_PLAN,
    ConversationStep.COMPLETE,
  ];

  // Run all steps automatically
  const handleRunAllSteps = async () => {
    setAutoRunning(true);
    const toolSequence: ToolType[] = [
      'profile_check',
      'transcript_check',
      'program_selection',
      'course_selection',
      'credit_distribution',
      'milestones_and_constraints',
      'generate_plan_confirmation',
    ];

    for (const tool of toolSequence) {
      const mockResult = createMockToolResult(tool);
      await injectToolResult(tool, mockResult);
      // Wait a bit between steps to see transitions
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setAutoRunning(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            🧪 Grad Plan Pipeline Test Lab
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Interactive testing environment for the graduation plan orchestration layer.
            All operations run in mock mode and do not affect real data.
          </Typography>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
            <Tab label="Pipeline Overview" value="overview" />
            <Tab label="Step Inspector" value="inspector" />
            <Tab label="State Viewer" value="state" />
            <Tab label="Full Pipeline Run" value="full-run" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Paper sx={{ p: 3 }}>
          {currentTab === 'overview' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Pipeline Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Shows all steps in the pipeline and current progress.
              </Typography>

              {/* Current State Info */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Current Step:</strong> {conversationState.currentStep}
                <br />
                <strong>Completed Steps:</strong> {conversationState.completedSteps.length}/{allSteps.length}
                <br />
                <strong>Active Tool:</strong> {activeTool || 'None'}
                <br />
                <strong>Processing:</strong> {isProcessing ? 'Yes' : 'No'}
              </Alert>

              {/* Step List */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {allSteps.map(step => {
                  const isCompleted = conversationState.completedSteps.includes(step);
                  const isCurrent = conversationState.currentStep === step;

                  return (
                    <Paper
                      key={step}
                      sx={{
                        p: 2,
                        bgcolor: isCurrent ? 'primary.light' : isCompleted ? 'success.light' : 'background.paper',
                        border: isCurrent ? '2px solid' : '1px solid',
                        borderColor: isCurrent ? 'primary.main' : 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1">
                            {isCompleted && '✓ '}
                            {isCurrent && '→ '}
                            {step}
                          </Typography>
                        </Box>
                        <Box>
                          {!isCompleted && (
                            <Button
                              size="small"
                              onClick={() => {
                                setSelectedStep(step);
                                setCurrentTab('inspector');
                              }}
                            >
                              Test This Step
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>

              {/* Agent Checks */}
              {agentChecks.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Agent Checks
                  </Typography>
                  {agentChecks.map(check => (
                    <Paper key={check.id} sx={{ p: 2, mb: 1 }}>
                      <Typography>
                        <strong>{check.label}:</strong> {check.status}
                      </Typography>
                      {check.evidence && (
                        <Typography variant="body2" color="text.secondary">
                          Evidence: {check.evidence.join(', ')}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {currentTab === 'inspector' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Step Inspector
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Test individual steps with custom or mock data.
              </Typography>

              {/* Active Tool Renderer */}
              {activeTool && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Testing tool: <strong>{activeTool}</strong>
                  </Alert>
                  <ToolRenderer
                    toolType={activeTool}
                    toolData={activeToolData}
                    onToolComplete={result => handleToolComplete(activeTool, result)}
                  />
                </Box>
              )}

              {!activeTool && (
                <Alert severity="warning">
                  No active tool. Use the Pipeline Overview tab to select a step to test.
                </Alert>
              )}
            </Box>
          )}

          {currentTab === 'state' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                State Viewer
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Full JSON view of the conversation state with live updates.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', overflow: 'auto', maxHeight: '70vh' }}>
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {JSON.stringify(conversationState, null, 2)}
                </pre>
              </Paper>

              {/* Messages */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Messages ({messages.length})
                </Typography>
                <Paper sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
                  {messages.map((msg, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {msg.role} - {msg.timestamp.toLocaleTimeString()}
                      </Typography>
                      <Typography variant="body2">{msg.content || `[${msg.toolType}]`}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            </Box>
          )}

          {currentTab === 'full-run' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Full Pipeline Run
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Run all steps sequentially with mock data to test the complete flow.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleRunAllSteps}
                  disabled={autoRunning || isProcessing}
                >
                  {autoRunning ? 'Running...' : 'Run All Steps'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Reset state
                    injectState(
                      createMockPipelineData().initialState
                    );
                  }}
                  disabled={autoRunning || isProcessing}
                >
                  Reset State
                </Button>
              </Box>

              {/* Progress Display */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Progress:</strong> {conversationState.completedSteps.length}/{allSteps.length} steps completed
              </Alert>

              {/* Recent Messages */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Pipeline Output
                </Typography>
                <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto' }}>
                  {messages.length === 0 && (
                    <Typography color="text.secondary">
                      No messages yet. Click "Run All Steps" to start the pipeline.
                    </Typography>
                  )}
                  {messages.map((msg, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: msg.role === 'assistant' ? 'grey.100' : 'primary.light',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {msg.role} - {msg.timestamp.toLocaleTimeString()}
                      </Typography>
                      <Typography variant="body2">
                        {msg.content || `[Tool: ${msg.toolType}]`}
                      </Typography>
                      {msg.decisionMeta && (
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'success.main' }}>
                          Decision: {msg.decisionMeta.title} | Evidence: {msg.decisionMeta.evidence.join(', ')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Paper>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
