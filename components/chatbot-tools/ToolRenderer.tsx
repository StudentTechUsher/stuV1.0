'use client';

import ProfileUpdateForm from './ProfileUpdateForm';
import TranscriptCheckForm from './TranscriptCheckForm';
import StudentTypeForm from './StudentTypeForm';
import ProgramSelectionForm from './ProgramSelectionForm';
import CourseSelectionForm from './CourseSelectionForm';
import MilestoneForm from './MilestoneForm';
import AdditionalConcernsForm from './AdditionalConcernsForm';
import GeneratePlanConfirmationForm from './GeneratePlanConfirmationForm';
import ActiveFeedbackPlanTool from './ActiveFeedbackPlanTool';
import CareerSuggestionsDisplay from './CareerSuggestionsDisplay';
import ProgramSuggestionsDisplay from './ProgramSuggestionsDisplay';
import { Button } from '@/components/ui/button';
// NEW: Phase 4 components
import { ProfileCheckStep } from '@/components/grad-plan/ProfileCheckStep';
import { CreditDistributionStep } from '@/components/grad-plan/CreditDistributionStep';
import { MilestonesAndConstraintsStep } from '@/components/grad-plan/MilestonesAndConstraintsStep';
import { ProfileUpdateInput } from '@/lib/chatbot/tools/profileUpdateTool';
import { TranscriptCheckInput } from '@/lib/chatbot/tools/transcriptCheckTool';
import { StudentTypeInput } from '@/lib/chatbot/tools/studentTypeTool';
import { ProgramSelectionInput } from '@/lib/chatbot/tools/programSelectionTool';
import { CourseSelectionInput } from '@/lib/chatbot/tools/courseSelectionTool';
import { MilestoneInput } from '@/lib/chatbot/tools/milestoneTool';
import { AdditionalConcernsInput } from '@/lib/chatbot/tools/additionalConcernsTool';
import { CareerSuggestionsInput } from '@/lib/chatbot/tools/careerSuggestionsTool';
import { ProgramSuggestionsInput } from '@/lib/chatbot/tools/programSuggestionsTool';
import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';
import type { ProgramRow } from '@/types/program';
import type { AgentStatus } from '@/lib/chatbot/grad-plan/types';

export type ToolType = 'profile_update' | 'profile_check' | 'transcript_check' | 'student_type' | 'career_pathfinder' | 'program_pathfinder' | 'program_selection' | 'course_selection' | 'credit_distribution' | 'milestones' | 'milestones_and_constraints' | 'additional_concerns' | 'career_suggestions' | 'program_suggestions' | 'generate_plan_confirmation' | 'active_feedback_plan';

interface ToolRendererProps {
  toolType: ToolType;
  toolData: {
    currentValues?: {
      est_grad_date?: string | null;
      est_grad_sem?: string | null;
      career_goals?: string | null;
      admission_year?: number | null;
      is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
      selected_gen_ed_program_id?: number | null;
    };
    hasActivePlan?: boolean;
    hasCourses?: boolean;
    hasTranscript?: boolean;
    studentType?: 'undergraduate' | 'honor' | 'graduate';
    universityId?: number;
    selectedProgramIds?: number[];
    genEdProgramIds?: number[];
    userId?: string;
    profileId?: string;
    studentAdmissionYear?: number | null;
    studentIsTransfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
    selectedGenEdProgramId?: number | null;
    careerSuggestions?: CareerSuggestionsInput;
    programSuggestions?: ProgramSuggestionsInput;
    suggestedPrograms?: Array<{ programName: string; programType: string }>;
    // NEW: Phase 4 data
    totalCredits?: number;
    studentData?: {
      admission_year: number;
      admission_term: string;
      est_grad_date: string;
    };
    academicTerms?: AcademicTermsConfig;
    distribution?: unknown;
    courseData?: unknown;
    suggestedDistribution?: SemesterAllocation[];
    academicTermsConfig?: AcademicTermsConfig;
    workStatus?: string;
    milestones?: Array<{ id?: string; type?: string; title?: string; timing?: string; term?: string; year?: number }>;
    lastCompletedTerm?: string | null;
    preferredStartTerms?: string[];
    mockMode?: boolean;
    mockProgramsData?: ProgramRow[];
    mockGenEdData?: ProgramRow[];
    mockTranscriptCourses?: Array<{ code: string; title: string; credits: number }>;
  };
  onToolComplete: (result: unknown) => void;
  onToolSkip?: () => void;
  onCareerPathfinderClick?: () => void;
  onProgramPathfinderClick?: () => void;
  onStudentDataChanged?: () => void;
  readOnly?: boolean;
  requiresApproval?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  agentStatus?: AgentStatus;
  variant?: 'default' | 'versionB';
}

export default function ToolRenderer({
  toolType,
  toolData,
  onToolComplete,
  onToolSkip,
  onCareerPathfinderClick,
  onProgramPathfinderClick,
  onStudentDataChanged,
  readOnly,
  requiresApproval,
  onApprove,
  onReject,
  agentStatus,
  variant = 'default',
}: Readonly<ToolRendererProps>) {
  const toolElement = (() => {
    switch (toolType) {
      case 'profile_update':
        return (
          <ProfileUpdateForm
            currentValues={toolData.currentValues || {}}
            universityId={toolData.universityId}
            hasActivePlan={toolData.hasActivePlan as boolean | undefined}
            onSubmit={(data: ProfileUpdateInput) => onToolComplete(data)}
            onSkip={onToolSkip}
            onCareerPathfinderClick={onCareerPathfinderClick}
            readOnly={readOnly}
          />
        );

      case 'transcript_check':
        return (
          <TranscriptCheckForm
            hasCourses={toolData.hasCourses || false}
            academicTerms={toolData.academicTerms}
            onSubmit={(data: TranscriptCheckInput) => onToolComplete(data)}
            readOnly={readOnly}
          />
        );

      case 'student_type':
        return (
          <StudentTypeForm
            onSubmit={(data: StudentTypeInput) => onToolComplete(data)}
            readOnly={readOnly}
          />
        );

      case 'program_selection':
        if (!toolData.studentType || !toolData.universityId) {
          return <div className="p-4 border rounded-lg text-red-500">Missing required data for program selection</div>;
        }
        return (
          <ProgramSelectionForm
            studentType={toolData.studentType}
            universityId={toolData.universityId}
            studentAdmissionYear={toolData.studentAdmissionYear}
            studentIsTransfer={toolData.studentIsTransfer}
            selectedGenEdProgramId={toolData.selectedGenEdProgramId}
            profileId={toolData.profileId as string | undefined}
            onSubmit={(data: ProgramSelectionInput) => onToolComplete(data)}
            onProgramPathfinderClick={onProgramPathfinderClick}
            suggestedPrograms={toolData.suggestedPrograms}
            readOnly={readOnly}
            variant={variant === 'versionB' ? 'v2' : 'default'}
          />
        );

      case 'course_selection':
        if (!toolData.studentType || !toolData.universityId || !toolData.selectedProgramIds) {
          return <div className="p-4 border rounded-lg text-red-500">Missing required data for course selection</div>;
        }
        return (
          <CourseSelectionForm
            studentType={toolData.studentType}
            universityId={toolData.universityId}
            selectedProgramIds={toolData.selectedProgramIds}
            genEdProgramIds={toolData.genEdProgramIds}
            userId={toolData.userId}
            hasTranscript={toolData.hasTranscript ?? false}
            onSubmit={(data: CourseSelectionInput) => onToolComplete(data)}
            readOnly={readOnly}
            mockMode={toolData.mockMode}
            mockProgramsData={toolData.mockProgramsData}
            mockGenEdData={toolData.mockGenEdData}
            mockTranscriptCourses={toolData.mockTranscriptCourses}
          />
        );

      case 'milestones':
        return (
          <MilestoneForm
            onSubmit={(data: MilestoneInput) => onToolComplete(data)}
            readOnly={readOnly}
          />
        );

      case 'additional_concerns':
        return (
          <AdditionalConcernsForm
            onSubmit={(data: AdditionalConcernsInput) => onToolComplete(data)}
            readOnly={readOnly}
          />
        );

      case 'generate_plan_confirmation':
        return (
          <GeneratePlanConfirmationForm
            academicTerms={toolData.academicTerms}
            lastCompletedTerm={toolData.lastCompletedTerm}
            preferredStartTerms={toolData.preferredStartTerms}
            onSubmit={(data) => onToolComplete(data)}
            readOnly={readOnly}
          />
        );

      case 'career_suggestions':
        if (!toolData.careerSuggestions) {
          return <div className="p-4 border rounded-lg text-red-500">Missing career suggestions data</div>;
        }
        return (
          <CareerSuggestionsDisplay
            suggestions={toolData.careerSuggestions}
            onSelectCareer={(careerTitle: string) => onToolComplete({ selectedCareer: careerTitle })}
            readOnly={readOnly}
          />
        );

      case 'program_suggestions':
        if (!toolData.programSuggestions) {
          return <div className="p-4 border rounded-lg text-red-500">Missing program suggestions data</div>;
        }
        return (
          <ProgramSuggestionsDisplay
            suggestions={toolData.programSuggestions}
            onSelectProgram={(programs) => onToolComplete(programs)}
            readOnly={readOnly}
          />
        );

      case 'profile_check':
        if (!toolData.userId) {
          return <div className="p-4 border rounded-lg text-red-500">Missing user ID for profile check</div>;
        }
        return (
          <ProfileCheckStep
            userId={toolData.userId}
            onComplete={() => onToolComplete({ completed: true })}
            onFetchStudentData={async () => {
              const response = await fetch('/api/student/planning-data');
              if (!response.ok) {
                throw new Error('Failed to fetch student planning data');
              }
              const data = await response.json();
              return data.data;
            }}
            onUpdateStudentData={async (updates) => {
              const response = await fetch('/api/student/planning-data', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });
              if (!response.ok) {
                throw new Error('Failed to update student planning data');
              }
            }}
            onCareerPathfinderClick={onCareerPathfinderClick}
            readOnly={readOnly}
          />
        );

      case 'credit_distribution':
        if (!toolData.totalCredits || !toolData.studentData || !toolData.academicTerms) {
          return <div className="p-4 border rounded-lg text-red-500">Missing data for credit distribution</div>;
        }
        return (
          <CreditDistributionStep
            totalCredits={toolData.totalCredits}
            studentData={toolData.studentData}
            hasTranscript={toolData.hasTranscript}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            academicTerms={toolData.academicTerms as any}
            onComplete={(data) => onToolComplete(data)}
            onUpdateGraduationTimeline={async (updates) => {
              const response = await fetch('/api/student/planning-data', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });

              if (!response.ok) {
                const body = await response.json().catch(() => null);
                return {
                  success: false,
                  error: body?.error || 'Failed to update graduation timeline',
                };
              }

              return { success: true };
            }}
            onStudentDataChanged={onStudentDataChanged}
            readOnly={readOnly}
            variant={variant}
          />
        );

      case 'milestones_and_constraints':
        return (
          <MilestonesAndConstraintsStep
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            distribution={toolData.distribution as any}
            studentType={toolData.studentType}
            onComplete={(data) => onToolComplete(data)}
            readOnly={readOnly}
            variant={variant}
          />
        );

      case 'active_feedback_plan':
        return (
          <ActiveFeedbackPlanTool
            courseData={toolData.courseData}
            suggestedDistribution={toolData.suggestedDistribution}
            hasTranscript={toolData.hasTranscript}
            academicTerms={toolData.academicTermsConfig}
            workStatus={toolData.workStatus}
            milestones={toolData.milestones}
            onComplete={(data) => onToolComplete(data)}
            readOnly={readOnly}
          />
        );

      case 'career_pathfinder':
        return <div className="p-4 border rounded-lg">Career Pathfinder - Conversation in progress...</div>;

      case 'program_pathfinder':
        return <div className="p-4 border rounded-lg">Program Pathfinder - Conversation in progress...</div>;

      default:
        return <div className="p-4 border rounded-lg text-red-500">Unknown tool type: {toolType}</div>;
    }
  })();

  const isReadOnly = Boolean(readOnly);
  const showApproval = Boolean(requiresApproval || agentStatus === 'awaiting_approval');

  if (!showApproval && !isReadOnly) {
    return toolElement;
  }

  return (
    <div className="space-y-3">
      <div className={isReadOnly ? 'pointer-events-none opacity-75' : undefined}>{toolElement}</div>
      {showApproval && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Awaiting approval to continue.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" size="sm" onClick={onApprove} className="flex-1" disabled={!onApprove}>
              Approve
            </Button>
            <Button variant="secondary" size="sm" onClick={onReject} className="flex-1" disabled={!onReject}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
