/**
 * Custom hook for managing wizard state using useReducer pattern
 */

import { useReducer, useCallback } from 'react';
import { WizardState, WizardAction, Elective } from './types';

const initialState: WizardState = {
  currentStep: 0,
  studentName: '',
  studentType: null,
  selectedPrograms: [],
  genEdStrategy: null,
  planMode: null,
  selectedCourses: {},
  userElectives: [],
  planName: '',
  isLoading: false,
  error: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_STUDENT_NAME':
      return { ...state, studentName: action.payload };

    case 'SET_STUDENT_TYPE':
      return { ...state, studentType: action.payload as 'undergraduate' | 'graduate' };

    case 'SET_PROGRAMS':
      return { ...state, selectedPrograms: action.payload };

    case 'SET_GEN_ED_STRATEGY':
      return { ...state, genEdStrategy: action.payload as 'early' | 'balanced' | 'flexible' };

    case 'SET_PLAN_MODE':
      return { ...state, planMode: action.payload as 'AUTO' | 'MANUAL' };

    case 'UPDATE_COURSE_SELECTION': {
      const { requirement, courses } = action.payload;
      return {
        ...state,
        selectedCourses: {
          ...state.selectedCourses,
          [requirement]: courses,
        },
      };
    }

    case 'ADD_ELECTIVE': {
      const exists = state.userElectives.some((e) => e.code === action.payload.code);
      if (exists) {
        return { ...state, error: 'This course has already been added.' };
      }
      return {
        ...state,
        userElectives: [...state.userElectives, action.payload],
        error: null,
      };
    }

    case 'REMOVE_ELECTIVE':
      return {
        ...state,
        userElectives: state.userElectives.filter((e) => e.code !== action.payload),
      };

    case 'SET_PLAN_NAME':
      return { ...state, planName: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useWizardState(prefilledData?: Partial<WizardState>) {
  const [state, dispatch] = useReducer(
    wizardReducer,
    prefilledData ? { ...initialState, ...prefilledData } : initialState
  );

  // Convenience methods for dispatching actions
  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const setStudentName = useCallback((name: string) => {
    dispatch({ type: 'SET_STUDENT_NAME', payload: name });
  }, []);

  const setStudentType = useCallback((type: string) => {
    dispatch({ type: 'SET_STUDENT_TYPE', payload: type });
  }, []);

  const setPrograms = useCallback((programs: string[]) => {
    dispatch({ type: 'SET_PROGRAMS', payload: programs });
  }, []);

  const setGenEdStrategy = useCallback((strategy: string) => {
    dispatch({ type: 'SET_GEN_ED_STRATEGY', payload: strategy });
  }, []);

  const setPlanMode = useCallback((mode: string) => {
    dispatch({ type: 'SET_PLAN_MODE', payload: mode });
  }, []);

  const updateCourseSelection = useCallback((requirement: string, courses: string[]) => {
    dispatch({
      type: 'UPDATE_COURSE_SELECTION',
      payload: { requirement, courses },
    });
  }, []);

  const addElective = useCallback((elective: Elective) => {
    dispatch({ type: 'ADD_ELECTIVE', payload: elective });
  }, []);

  const removeElective = useCallback((code: string) => {
    dispatch({ type: 'REMOVE_ELECTIVE', payload: code });
  }, []);

  const setPlanName = useCallback((name: string) => {
    dispatch({ type: 'SET_PLAN_NAME', payload: name });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    setStep,
    setStudentName,
    setStudentType,
    setPrograms,
    setGenEdStrategy,
    setPlanMode,
    updateCourseSelection,
    addElective,
    removeElective,
    setPlanName,
    setLoading,
    setError,
    reset,
  };
}
