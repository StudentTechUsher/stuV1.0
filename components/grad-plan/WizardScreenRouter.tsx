'use client';

import React from 'react';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';
import NameScreen from './screens/NameScreen';
import GraduationDateScreen from './screens/GraduationDateScreen';
import GraduationSemesterScreen from './screens/GraduationSemesterScreen';
import CareerGoalsScreen from './screens/CareerGoalsScreen';
import TranscriptScreen from './screens/TranscriptScreen';
import StudentTypeScreen from './screens/StudentTypeScreen';

interface WizardScreenRouterProps {
  currentStep: ConversationStep;
  profileData: {
    fname?: string;
    lname?: string;
    name?: string;
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
  };
  onStepComplete: (data: unknown) => Promise<void>;
  onStepBack: () => void;
  isLoading?: boolean;
}

export default function WizardScreenRouter({
  currentStep,
  profileData,
  onStepComplete,
  onStepBack,
  isLoading = false,
}: Readonly<WizardScreenRouterProps>) {
  // Helper function to get screen step number for progress tracking
  const getScreenStepNumber = (): number => {
    switch (currentStep) {
      case ConversationStep.PROFILE_SETUP:
        return 1; // Will be further subdivided based on which profile field we're on
      case ConversationStep.TRANSCRIPT_CHECK:
        return 5;
      case ConversationStep.STUDENT_TYPE:
        return 6;
      case ConversationStep.PROGRAM_SELECTION:
        return 7;
      case ConversationStep.COURSE_SELECTION:
        return 8;
      case ConversationStep.ADDITIONAL_CONCERNS:
        return 9;
      case ConversationStep.GENERATING_PLAN:
        return 10;
      default:
        return 1;
    }
  };

  // For now, render screens based on current step
  // Note: Profile setup will be subdivided into multiple screens
  switch (currentStep) {
    case ConversationStep.PROFILE_SETUP:
      // Combine fname and lname if available, otherwise fall back to name field
      const fullName = profileData.fname && profileData.lname
        ? `${profileData.fname} ${profileData.lname}`
        : profileData.fname || profileData.name || '';

      return (
        <NameScreen
          defaultName={fullName}
          onSubmit={(name) => onStepComplete({ type: 'name', name })}
          onBack={onStepBack}
          isLoading={isLoading}
        />
      );

    case ConversationStep.TRANSCRIPT_CHECK:
      return (
        <TranscriptScreen
          hasCourses={false}
          onSubmit={(hasTranscript) =>
            onStepComplete({ hasTranscript, wantsToUpload: false, wantsToUpdate: false })
          }
          onBack={onStepBack}
          isLoading={isLoading}
        />
      );

    case ConversationStep.STUDENT_TYPE:
      return (
        <StudentTypeScreen
          onSubmit={(studentType) => onStepComplete({ studentType })}
          onBack={onStepBack}
          isLoading={isLoading}
        />
      );

    default:
      return (
        <div className="text-center text-gray-600">
          <p>Screen not implemented yet for step: {currentStep}</p>
        </div>
      );
  }
}
