'use client';

import ProfileUpdateForm from './ProfileUpdateForm';
import TranscriptCheckForm from './TranscriptCheckForm';
import StudentTypeForm from './StudentTypeForm';
import ProgramSelectionForm from './ProgramSelectionForm';
import CourseSelectionForm from './CourseSelectionForm';
import MilestoneForm from './MilestoneForm';
import AdditionalConcernsForm from './AdditionalConcernsForm';
import CareerSuggestionsDisplay from './CareerSuggestionsDisplay';
import ProgramSuggestionsDisplay from './ProgramSuggestionsDisplay';
import { ProfileUpdateInput } from '@/lib/chatbot/tools/profileUpdateTool';
import { TranscriptCheckInput } from '@/lib/chatbot/tools/transcriptCheckTool';
import { StudentTypeInput } from '@/lib/chatbot/tools/studentTypeTool';
import { ProgramSelectionInput } from '@/lib/chatbot/tools/programSelectionTool';
import { CourseSelectionInput } from '@/lib/chatbot/tools/courseSelectionTool';
import { MilestoneInput } from '@/lib/chatbot/tools/milestoneTool';
import { AdditionalConcernsInput } from '@/lib/chatbot/tools/additionalConcernsTool';
import { CareerSuggestionsInput } from '@/lib/chatbot/tools/careerSuggestionsTool';
import { ProgramSuggestionsInput } from '@/lib/chatbot/tools/programSuggestionsTool';

export type ToolType = 'profile_update' | 'transcript_check' | 'student_type' | 'career_pathfinder' | 'program_pathfinder' | 'program_selection' | 'course_selection' | 'milestones' | 'additional_concerns' | 'career_suggestions' | 'program_suggestions';

interface ToolRendererProps {
  toolType: ToolType;
  toolData: {
    currentValues?: {
      est_grad_date?: string | null;
      est_grad_sem?: string | null;
      career_goals?: string | null;
      admission_year?: number | null;
      is_transfer?: boolean | null;
    };
    hasCourses?: boolean;
    hasTranscript?: boolean;
    studentType?: 'undergraduate' | 'graduate';
    universityId?: number;
    selectedProgramIds?: number[];
    genEdProgramIds?: number[];
    userId?: string;
    profileId?: string;
    studentAdmissionYear?: number | null;
    studentIsTransfer?: boolean | null;
    careerSuggestions?: CareerSuggestionsInput;
    programSuggestions?: ProgramSuggestionsInput;
    suggestedPrograms?: Array<{ programName: string; programType: string }>;
  };
  onToolComplete: (result: unknown) => void;
  onToolSkip?: () => void;
  onCareerPathfinderClick?: () => void;
  onProgramPathfinderClick?: () => void;
}

export default function ToolRenderer({
  toolType,
  toolData,
  onToolComplete,
  onToolSkip,
  onCareerPathfinderClick,
  onProgramPathfinderClick,
}: Readonly<ToolRendererProps>) {
  switch (toolType) {
    case 'profile_update':
      return (
        <ProfileUpdateForm
          currentValues={toolData.currentValues || {}}
          onSubmit={(data: ProfileUpdateInput) => onToolComplete(data)}
          onSkip={onToolSkip}
          onCareerPathfinderClick={onCareerPathfinderClick}
        />
      );

    case 'transcript_check':
      return (
        <TranscriptCheckForm
          hasCourses={toolData.hasCourses || false}
          onSubmit={(data: TranscriptCheckInput) => onToolComplete(data)}
        />
      );

    case 'student_type':
      return (
        <StudentTypeForm
          onSubmit={(data: StudentTypeInput) => onToolComplete(data)}
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
          profileId={toolData.profileId as string | undefined}
          onSubmit={(data: ProgramSelectionInput) => onToolComplete(data)}
          onProgramPathfinderClick={onProgramPathfinderClick}
          suggestedPrograms={toolData.suggestedPrograms}
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
        />
      );

    case 'milestones':
      return (
        <MilestoneForm
          onSubmit={(data: MilestoneInput) => onToolComplete(data)}
        />
      );

    case 'additional_concerns':
      return (
        <AdditionalConcernsForm
          onSubmit={(data: AdditionalConcernsInput) => onToolComplete(data)}
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
        />
      );

    // Pathfinder conversations in progress
    case 'career_pathfinder':
      return <div className="p-4 border rounded-lg">Career Pathfinder - Conversation in progress...</div>;

    case 'program_pathfinder':
      return <div className="p-4 border rounded-lg">Program Pathfinder - Conversation in progress...</div>;

    default:
      return <div className="p-4 border rounded-lg text-red-500">Unknown tool type: {toolType}</div>;
  }
}
