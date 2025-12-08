import { useMemo } from 'react';
import { GraduationPlan } from '@/types/graduation-plan';
import { Term } from './types';

export function usePlanParser(plan?: Record<string, unknown> | GraduationPlan | Term[]) {
  const planData = useMemo((): Term[] => {
    if (!plan) return [];

    const planRecord = plan as Record<string, unknown>;

    // Helper to filter out milestones/events from plan array
    const filterTermsOnly = (items: unknown[]): Term[] => {
      return items.filter((item): item is Term => {
        if (typeof item !== 'object' || item === null) return false;
        const candidate = item as Record<string, unknown>;
        // A term has a 'term' property but NOT 'type' and 'afterTerm' (which identify events)
        return 'term' in candidate && !('type' in candidate && 'afterTerm' in candidate);
      });
    };

    // Check if plan itself is an array of terms (direct plan_details passed)
    if (Array.isArray(plan)) {
      return filterTermsOnly(plan);
    }

    // Check for the actual database structure: plan_details.plan
    if (planRecord.plan_details &&
        typeof planRecord.plan_details === 'object' &&
        planRecord.plan_details !== null) {
      const planDetails = planRecord.plan_details as Record<string, unknown>;
      if (Array.isArray(planDetails.plan)) {
        return filterTermsOnly(planDetails.plan);
      }
    }
    // Check if plan has a 'plan' property (nested structure) - AI RESPONSE FORMAT
    else if (Array.isArray(planRecord.plan)) {
      return filterTermsOnly(planRecord.plan);
    }

    // Add more flexible parsing similar to GradPlanViewer
    // Check for semesters property
    if (Array.isArray(planRecord.semesters)) {
      return filterTermsOnly(planRecord.semesters);
    }

    // Check for terms property
    if (Array.isArray(planRecord.terms)) {
      return filterTermsOnly(planRecord.terms);
    }

    // Check for plannedTerms property (AI response format variant)
    if (Array.isArray(planRecord.plannedTerms)) {
      return filterTermsOnly(planRecord.plannedTerms);
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
