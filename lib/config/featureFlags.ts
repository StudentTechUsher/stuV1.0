function parseBooleanFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isGradPlanAutomaticMastraWorkflowEnabled(): boolean {
  return parseBooleanFlag(process.env.GRAD_PLAN_AUTOMATIC_MASTRA_WORKFLOW);
}

export function isGradPlanQuickCourseSearchEnabled(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_GRAD_PLAN_QUICK_COURSE_SEARCH_ENABLED);
}
