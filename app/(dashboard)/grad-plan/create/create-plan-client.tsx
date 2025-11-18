'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import {
  ConversationState,
  ConversationStep,
} from '@/lib/chatbot/grad-plan/types';
import {
  createInitialState,
  updateState,
} from '@/lib/chatbot/grad-plan/stateManager';
import {
  generateConversationId,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
} from '@/lib/chatbot/grad-plan/statePersistence';
import { getNextStep } from '@/lib/chatbot/grad-plan/conversationState';
import WizardContainer from '@/components/grad-plan/WizardContainer';
import NameScreen from '@/components/grad-plan/screens/NameScreen';
import GraduationDateScreen from '@/components/grad-plan/screens/GraduationDateScreen';
import GraduationSemesterScreen from '@/components/grad-plan/screens/GraduationSemesterScreen';
import CareerGoalsScreen from '@/components/grad-plan/screens/CareerGoalsScreen';
import TranscriptScreen from '@/components/grad-plan/screens/TranscriptScreen';
import StudentTypeScreen from '@/components/grad-plan/screens/StudentTypeScreen';
import { updateProfileForChatbotAction, fetchUserCoursesAction, getAiPromptAction, organizeCoursesIntoSemestersAction } from '@/lib/services/server-actions';

interface CreatePlanClientProps {
  user: User;
  studentProfile: {
    id: string;
    university_id: number;
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
  hasCourses: boolean;
}

// Track which profile sub-screen we're on (wizard breaks profile into multiple screens)
type ProfileSubStep = 'name' | 'date' | 'semester' | 'career';

export default function CreatePlanClient({
  user,
  studentProfile,
  hasCourses,
}: Readonly<CreatePlanClientProps>) {
  const router = useRouter();

  // Initialize conversation state
  const [conversationState, setConversationState] = useState<ConversationState>(() => {
    const conversationId = generateConversationId();
    return createInitialState(
      conversationId,
      studentProfile.id,
      studentProfile.university_id
    );
  });

  // Track which profile sub-screen we're on
  const [profileSubStep, setProfileSubStep] = useState<ProfileSubStep>('name');
  const [isLoading, setIsLoading] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlConversationId = params.get('id');

    if (urlConversationId) {
      const saved = loadStateFromLocalStorage(urlConversationId);
      if (saved) {
        setConversationState(saved);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveStateToLocalStorage(conversationState);
  }, [conversationState]);

  // Get current step number for progress bar (1-indexed)
  const getCurrentStepNumber = (): number => {
    if (conversationState.currentStep === ConversationStep.PROFILE_SETUP) {
      // Profile has 4 sub-steps
      const profileSteps: Record<ProfileSubStep, number> = {
        name: 1,
        date: 2,
        semester: 3,
        career: 4,
      };
      return profileSteps[profileSubStep];
    }

    const stepNumbers: Record<ConversationStep, number> = {
      [ConversationStep.INITIALIZE]: 1,
      [ConversationStep.PROFILE_SETUP]: 1,
      [ConversationStep.CAREER_PATHFINDER]: 1,
      [ConversationStep.TRANSCRIPT_CHECK]: 5,
      [ConversationStep.STUDENT_TYPE]: 6,
      [ConversationStep.PROGRAM_SELECTION]: 7,
      [ConversationStep.COURSE_METHOD]: 7,
      [ConversationStep.COURSE_SELECTION]: 8,
      [ConversationStep.ELECTIVES]: 8,
      [ConversationStep.ADDITIONAL_CONCERNS]: 9,
      [ConversationStep.GENERATING_PLAN]: 10,
      [ConversationStep.COMPLETE]: 11,
    };

    return stepNumbers[conversationState.currentStep] || 1;
  };

  const getTotalSteps = (): number => {
    // 4 (profile) + 1 (transcript) + 1 (student type) + 1 (program) + 1 (course) + 1 (concerns) + 1 (generate) = 10
    if (conversationState.currentStep === ConversationStep.PROFILE_SETUP) {
      return 4; // profile sub-steps
    }
    return 10; // total wizard steps
  };

  const handleProfileNameSubmit = async (name: string) => {
    // Store name in state if needed (or just move forward)
    // Move to next profile sub-step
    setProfileSubStep('date');
  };

  const handleProfileDateSubmit = async (date: string) => {
    // Update conversation state with date
    setConversationState(prev =>
      updateState(prev, {
        step: ConversationStep.PROFILE_SETUP,
        data: {
          estGradDate: date,
        },
      })
    );
    setProfileSubStep('semester');
  };

  const handleProfileSemesterSubmit = async (semester: string) => {
    // Update conversation state with semester
    setConversationState(prev =>
      updateState(prev, {
        step: ConversationStep.PROFILE_SETUP,
        data: {
          estGradSem: semester,
        },
      })
    );
    setProfileSubStep('career');
  };

  const handleProfileCareerSubmit = async (careerGoals: string) => {
    setIsLoading(true);
    try {
      // Collect all profile data and submit
      const profileData = {
        estGradDate: conversationState.collectedData.estGradDate,
        estGradSem: conversationState.collectedData.estGradSem,
        careerGoals: careerGoals.trim() || null,
      };

      // Update profile via server action
      const updateResult = await updateProfileForChatbotAction(user.id, profileData);

      if (updateResult.success) {
        // Update conversation state
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.PROFILE_SETUP,
            data: {
              estGradDate: profileData.estGradDate ?? null,
              estGradSem: profileData.estGradSem ?? null,
              careerGoals: profileData.careerGoals,
            },
            completedStep: ConversationStep.PROFILE_SETUP,
          });

          // Move to next step
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Reset profile sub-step
        setProfileSubStep('name');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCareerSkip = async () => {
    setIsLoading(true);
    try {
      const profileData = {
        estGradDate: conversationState.collectedData.estGradDate,
        estGradSem: conversationState.collectedData.estGradSem,
        careerGoals: null,
      };

      const updateResult = await updateProfileForChatbotAction(user.id, profileData);

      if (updateResult.success) {
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.PROFILE_SETUP,
            data: {
              estGradDate: profileData.estGradDate ?? null,
              estGradSem: profileData.estGradSem ?? null,
              careerGoals: null,
            },
            completedStep: ConversationStep.PROFILE_SETUP,
          });

          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        setProfileSubStep('name');
      }
    } catch (error) {
      console.error('Error skipping career goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileBack = () => {
    if (profileSubStep === 'date') {
      setProfileSubStep('name');
    } else if (profileSubStep === 'semester') {
      setProfileSubStep('date');
    } else if (profileSubStep === 'career') {
      setProfileSubStep('semester');
    }
  };

  const handleTranscriptSubmit = async (hasTranscript: boolean) => {
    setIsLoading(true);
    try {
      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.TRANSCRIPT_CHECK,
          data: {
            hasTranscript,
            transcriptUploaded: false,
            needsTranscriptUpdate: false,
          },
          completedStep: ConversationStep.TRANSCRIPT_CHECK,
        });

        return updateState(updated, {
          step: getNextStep(updated),
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentTypeSubmit = async (studentType: 'undergraduate' | 'graduate') => {
    setIsLoading(true);
    try {
      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.STUDENT_TYPE,
          data: {
            studentType,
          },
          completedStep: ConversationStep.STUDENT_TYPE,
        });

        return updateState(updated, {
          step: getNextStep(updated),
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (conversationState.currentStep === ConversationStep.PROFILE_SETUP) {
      handleProfileBack();
    } else {
      // Go back to previous main step
      const previousCompletedSteps = conversationState.completedSteps.slice(0, -1);
      const previousStep = previousCompletedSteps[previousCompletedSteps.length - 1] || ConversationStep.PROFILE_SETUP;

      setConversationState(prev => updateState(prev, {
        step: previousStep,
        completedSteps: previousCompletedSteps,
      }));
    }
  };

  const handleCancel = () => {
    router.push('/grad-plan');
  };

  // Render appropriate screen based on current step
  const renderCurrentScreen = () => {
    if (conversationState.currentStep === ConversationStep.PROFILE_SETUP) {
      if (profileSubStep === 'name') {
        return (
          <NameScreen
            defaultName={studentProfile.first_name || ''}
            onSubmit={handleProfileNameSubmit}
            onBack={handleCancel}
            isLoading={isLoading}
          />
        );
      } else if (profileSubStep === 'date') {
        return (
          <GraduationDateScreen
            defaultDate={studentProfile.est_grad_date || ''}
            onSubmit={handleProfileDateSubmit}
            onBack={handleProfileBack}
            isLoading={isLoading}
          />
        );
      } else if (profileSubStep === 'semester') {
        return (
          <GraduationSemesterScreen
            defaultSemester={studentProfile.est_grad_sem || ''}
            onSubmit={handleProfileSemesterSubmit}
            onBack={handleProfileBack}
            isLoading={isLoading}
          />
        );
      } else {
        return (
          <CareerGoalsScreen
            defaultGoals={studentProfile.career_goals || ''}
            onSubmit={handleProfileCareerSubmit}
            onSkip={handleProfileCareerSkip}
            onBack={handleProfileBack}
            isLoading={isLoading}
          />
        );
      }
    } else if (conversationState.currentStep === ConversationStep.TRANSCRIPT_CHECK) {
      return (
        <TranscriptScreen
          onSubmit={handleTranscriptSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      );
    } else if (conversationState.currentStep === ConversationStep.STUDENT_TYPE) {
      return (
        <StudentTypeScreen
          onSubmit={handleStudentTypeSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      );
    }

    return (
      <div className="text-center text-gray-600">
        <p>Screen not yet implemented</p>
      </div>
    );
  };

  return (
    <WizardContainer
      title="Create Your Graduation Plan"
      subtitle={conversationState.currentStep === ConversationStep.PROFILE_SETUP ? undefined : 'Build your personalized path to graduation'}
      currentStep={getCurrentStepNumber()}
      totalSteps={conversationState.currentStep === ConversationStep.PROFILE_SETUP ? 4 : 10}
      onBack={handleBack}
      onCancel={handleCancel}
      isLoading={isLoading}
    >
      {renderCurrentScreen()}
    </WizardContainer>
  );
}
