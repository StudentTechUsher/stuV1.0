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
import CareerGoalsScreen from '@/components/grad-plan/screens/CareerGoalsScreen';
import TranscriptScreen from '@/components/grad-plan/screens/TranscriptScreen';
import StudentTypeScreen from '@/components/grad-plan/screens/StudentTypeScreen';
import ProgramSelectionScreen from '@/components/grad-plan/screens/ProgramSelectionScreen';
import CourseSelectionScreen from '@/components/grad-plan/screens/CourseSelectionScreen';
import AdditionalConcernsScreen from '@/components/grad-plan/screens/AdditionalConcernsScreen';
import GeneratingPlanScreen from '@/components/grad-plan/screens/GeneratingPlanScreen';
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
type ProfileSubStep = 'name' | 'date' | 'career';

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

  // Initialize or transition from INITIALIZE to PROFILE_SETUP
  useEffect(() => {
    // Check if we need to load from localStorage
    const params = new URLSearchParams(window.location.search);
    const urlConversationId = params.get('id');

    if (urlConversationId) {
      const saved = loadStateFromLocalStorage(urlConversationId);
      if (saved) {
        setConversationState(saved);
        return;
      }
    }

    // Transition from INITIALIZE to PROFILE_SETUP
    if (conversationState.currentStep === ConversationStep.INITIALIZE) {
      setConversationState(prev =>
        updateState(prev, {
          step: ConversationStep.PROFILE_SETUP,
        })
      );
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
    // Extract semester from date
    // Winter: April 30, Spring: May 31, Summer: August 31, Fall: December 15
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1; // getMonth is 0-indexed

    let semester = '';
    if (month === 4 || month === 5) {
      semester = 'Winter';
    } else if (month === 5) {
      semester = 'Spring';
    } else if (month === 8) {
      semester = 'Summer';
    } else if (month === 12) {
      semester = 'Fall';
    }

    // Update conversation state with date and semester
    setConversationState(prev =>
      updateState(prev, {
        step: ConversationStep.PROFILE_SETUP,
        data: {
          estGradDate: date,
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
    } else if (profileSubStep === 'career') {
      setProfileSubStep('date');
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

  const handleProgramSelectionSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const programData = data as any;

      // Build selected programs from the submitted data
      const selectedPrograms: any[] = [];

      if (programData.studentType === 'undergraduate') {
        programData.programs.majorIds.forEach((id: number) => {
          selectedPrograms.push({
            programId: id,
            programName: '',
            programType: 'major',
          });
        });
        if (programData.programs.minorIds) {
          programData.programs.minorIds.forEach((id: number) => {
            selectedPrograms.push({
              programId: id,
              programName: '',
              programType: 'minor',
            });
          });
        }
        if (programData.programs.genEdIds) {
          programData.programs.genEdIds.forEach((id: number) => {
            selectedPrograms.push({
              programId: id,
              programName: '',
              programType: 'general_education',
            });
          });
        }
      } else {
        programData.programs.graduateProgramIds.forEach((id: number) => {
          selectedPrograms.push({
            programId: id,
            programName: '',
            programType: 'graduate',
          });
        });
      }

      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.PROGRAM_SELECTION,
          data: {
            selectedPrograms,
          },
          completedStep: ConversationStep.PROGRAM_SELECTION,
        });

        return updateState(updated, {
          step: getNextStep(updated),
        });
      });
    } catch (error) {
      console.error('Error in program selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseSelectionSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const courseData = data as any;

      setConversationState(prev => {
        // Mark COURSE_METHOD as complete
        const withMethod = updateState(prev, {
          step: ConversationStep.COURSE_METHOD,
          data: {
            courseSelectionMethod: 'manual',
          },
          completedStep: ConversationStep.COURSE_METHOD,
        });

        // Mark COURSE_SELECTION as complete
        const withSelection = updateState(withMethod, {
          step: ConversationStep.COURSE_SELECTION,
          completedStep: ConversationStep.COURSE_SELECTION,
        });

        // Move to next step (ADDITIONAL_CONCERNS or GENERATING_PLAN)
        return updateState(withSelection, {
          step: getNextStep(withSelection),
        });
      });
    } catch (error) {
      console.error('Error in course selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdditionalConcernsSubmit = async (concerns: string) => {
    setIsLoading(true);
    try {
      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.ADDITIONAL_CONCERNS,
          data: {
            additionalConcerns: concerns.trim() || null,
          },
          completedStep: ConversationStep.ADDITIONAL_CONCERNS,
        });

        return updateState(updated, {
          step: getNextStep(updated),
        });
      });
    } catch (error) {
      console.error('Error in additional concerns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdditionalConcernsSkip = async () => {
    setIsLoading(true);
    try {
      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.ADDITIONAL_CONCERNS,
          data: {
            additionalConcerns: null,
          },
          completedStep: ConversationStep.ADDITIONAL_CONCERNS,
        });

        return updateState(updated, {
          step: getNextStep(updated),
        });
      });
    } catch (error) {
      console.error('Error skipping additional concerns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    try {
      // Get the prompt from database
      const promptTemplate = await getAiPromptAction('organize_grad_plan');
      if (!promptTemplate) {
        throw new Error('Prompt template not found');
      }

      // Fetch user courses if transcript exists
      const userCoursesResult = hasCourses ? await fetchUserCoursesAction(user.id) : null;
      const takenCourses = userCoursesResult?.success && userCoursesResult.courses
        ? userCoursesResult.courses.map(course => ({
            code: course.code,
            title: course.title,
            credits: course.credits,
            term: course.term,
            grade: course.grade,
            status: course.grade === 'In Progress' ? 'In-Progress' : 'Completed',
            source: course.origin === 'manual' ? 'Manual' : 'Transcript',
          }))
        : [];

      // Get program IDs from state
      const programIds = conversationState.collectedData.selectedPrograms.map(p => p.programId);

      // Call the plan generation server action
      const result = await organizeCoursesIntoSemestersAction(
        {
          selectedCourses: conversationState.collectedData.selectedCourses || {},
          programs: conversationState.collectedData.selectedPrograms || [],
          studentType: conversationState.collectedData.studentType || 'undergraduate',
          selectionMode: 'MANUAL',
          selectedPrograms: programIds,
          takenCourses,
        },
        {
          prompt_name: 'organize_grad_plan',
          prompt: promptTemplate,
          model: 'gpt-4-mini',
          max_output_tokens: 25_000,
        }
      );

      if (!result.success || !result.accessId) {
        throw new Error(result.message || 'Failed to generate graduation plan');
      }

      // Update state to COMPLETE
      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.GENERATING_PLAN,
          completedStep: ConversationStep.GENERATING_PLAN,
        });

        return updateState(updated, {
          step: ConversationStep.COMPLETE,
        });
      });

      // Navigate to the grad plan page after a brief delay
      setTimeout(() => {
        router.push(`/grad-plan/${result.accessId}`);
      }, 2000);
    } catch (error) {
      console.error('Error generating graduation plan:', error);
      alert('Error generating your plan. Please try again.');
      setIsLoading(false);
    }
  };

  // Render appropriate screen based on current step
  const renderCurrentScreen = () => {
    // Handle INITIALIZE step (should auto-transition, but safeguard just in case)
    if (conversationState.currentStep === ConversationStep.INITIALIZE) {
      return (
        <div className="w-full space-y-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Initializing your graduation plan...
            </h2>
          </div>
          <div className="flex justify-center py-12">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-r-indigo-600 animate-spin"
                style={{ animationDuration: '2s' }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (conversationState.currentStep === ConversationStep.PROFILE_SETUP) {
      if (profileSubStep === 'name') {
        return (
          <NameScreen
            defaultName={
              (studentProfile['fname'] as string) ||
              (studentProfile.first_name && studentProfile.last_name
                ? `${studentProfile.first_name} ${studentProfile.last_name}`
                : studentProfile.first_name || '')
            }
            onSubmit={handleProfileNameSubmit}
            onBack={handleCancel}
            isLoading={isLoading}
          />
        );
      } else if (profileSubStep === 'date') {
        return (
          <GraduationDateScreen
            defaultDate={studentProfile.est_grad_date || ''}
            defaultSemester={studentProfile.est_grad_sem || ''}
            onSubmit={handleProfileDateSubmit}
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
    } else if (conversationState.currentStep === ConversationStep.PROGRAM_SELECTION) {
      return (
        <ProgramSelectionScreen
          studentType={conversationState.collectedData.studentType || 'undergraduate'}
          universityId={studentProfile.university_id}
          onSubmit={handleProgramSelectionSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      );
    } else if (conversationState.currentStep === ConversationStep.COURSE_SELECTION) {
      const majorMinorIds = conversationState.collectedData.selectedPrograms
        .filter(p => p.programType === 'major' || p.programType === 'minor')
        .map(p => p.programId);
      const genEdIds = conversationState.collectedData.selectedPrograms
        .filter(p => p.programType === 'general_education')
        .map(p => p.programId);

      return (
        <CourseSelectionScreen
          studentType={conversationState.collectedData.studentType || 'undergraduate'}
          universityId={studentProfile.university_id}
          selectedProgramIds={majorMinorIds}
          genEdProgramIds={genEdIds}
          onSubmit={handleCourseSelectionSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      );
    } else if (conversationState.currentStep === ConversationStep.ADDITIONAL_CONCERNS) {
      return (
        <AdditionalConcernsScreen
          defaultConcerns={conversationState.collectedData.additionalConcerns || ''}
          onSubmit={handleAdditionalConcernsSubmit}
          onSkip={handleAdditionalConcernsSkip}
          onBack={handleBack}
          isLoading={isLoading}
        />
      );
    } else if (conversationState.currentStep === ConversationStep.GENERATING_PLAN) {
      // Automatically start generation when reaching this step
      useEffect(() => {
        if (conversationState.currentStep === ConversationStep.GENERATING_PLAN && !isLoading) {
          handleGeneratePlan();
        }
      }, [conversationState.currentStep]);

      return <GeneratingPlanScreen />;
    }

    return (
      <div className="text-center text-gray-600">
        <p>Screen not yet implemented for step: {conversationState.currentStep}</p>
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
