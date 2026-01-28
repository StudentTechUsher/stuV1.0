'use client';

import React from 'react';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';
import NameScreen from './screens/NameScreen';
import TranscriptScreen from './screens/TranscriptScreen';

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


  // For now, render screens based on current step
  // Note: Profile setup will be subdivided into multiple screens
  switch (currentStep) {
    case ConversationStep.PROFILE_CHECK:
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

    default:
      return (
        <div className="text-center text-gray-600">
          <p>Screen not implemented yet for step: {currentStep}</p>
        </div>
      );
  }
}
