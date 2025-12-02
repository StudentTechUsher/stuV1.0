/**
 * Type definitions for the Grad Plan Wizard
 */

export interface Elective {
  code: string;
  title: string;
  credits: number;
}

export interface WizardState {
  currentStep: number;
  studentName: string;
  studentType: 'undergraduate' | 'graduate' | 'other' | null;
  selectedPrograms: string[];
  genEdStrategy: 'early' | 'balanced' | 'flexible' | null;
  planMode: 'AUTO' | 'MANUAL' | null;
  selectedCourses: Record<string, string[]>;
  userElectives: Elective[];
  planName: string;
  isLoading: boolean;
  error: string | null;
}

export type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_STUDENT_NAME'; payload: string }
  | { type: 'SET_STUDENT_TYPE'; payload: string }
  | { type: 'SET_PROGRAMS'; payload: string[] }
  | { type: 'SET_GEN_ED_STRATEGY'; payload: string }
  | { type: 'SET_PLAN_MODE'; payload: string }
  | { type: 'UPDATE_COURSE_SELECTION'; payload: { requirement: string; courses: string[] } }
  | { type: 'ADD_ELECTIVE'; payload: Elective }
  | { type: 'REMOVE_ELECTIVE'; payload: string }
  | { type: 'SET_PLAN_NAME'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

export interface StepConfig {
  title: string;
  subtext?: string;
  shouldShow: (state: WizardState) => boolean;
  isValid: (state: WizardState) => boolean;
}

export interface ProgramData {
  id: string | number;
  name: string;
  type: 'major' | 'minor' | 'gen_ed';
  requirements?: Array<{
    id: string;
    name: string;
    subtitle?: string;
    courses: Array<{ code: string; title: string; credits: number }>;
  }>;
}

export interface CourseOffering {
  code: string;
  title: string;
  credits: number;
  semester?: string;
}
