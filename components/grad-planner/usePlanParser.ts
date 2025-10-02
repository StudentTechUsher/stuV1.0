import { useMemo } from 'react';
import { GraduationPlan } from '@/types/graduation-plan';
import { Term } from './types';

export function usePlanParser(plan?: Record<string, unknown> | GraduationPlan | Term[]) {
  const planData = useMemo((): Term[] => {
    if (!plan) return [];

    const planRecord = plan as Record<string, unknown>;

    // Check if plan itself is an array of terms (direct plan_details passed)
    if (Array.isArray(plan)) {
      return plan;
    }

    // Check for the actual database structure: plan_details.plan
    if (planRecord.plan_details &&
        typeof planRecord.plan_details === 'object' &&
        planRecord.plan_details !== null) {
      const planDetails = planRecord.plan_details as Record<string, unknown>;
      if (Array.isArray(planDetails.plan)) {
        return planDetails.plan as Term[];
      }
    }
    // Check if plan has a 'plan' property (nested structure) - AI RESPONSE FORMAT
    else if (Array.isArray(planRecord.plan)) {
      return planRecord.plan as Term[];
    }

    // Add more flexible parsing similar to GradPlanViewer
    // Check for semesters property
    if (Array.isArray(planRecord.semesters)) {
      return planRecord.semesters as Term[];
    }

    // Check for terms property
    if (Array.isArray(planRecord.terms)) {
      return planRecord.terms as Term[];
    }

    return [];
  }, [plan]);

  // Extract additional info from plan or plan_details if available
  const planRecord = plan as Record<string, unknown>;

  // If we're passed plan_details directly, metadata is at root level
  // If we're passed the full database record, metadata is in plan_details
  const sourceData = planRecord?.plan_details ?
    (planRecord.plan_details as Record<string, unknown>) :
    planRecord || {};

  const assumptions = sourceData.assumptions as string[] | undefined;
  const durationYears = sourceData.duration_years as number | undefined;

  return { planData, assumptions, durationYears };
}
