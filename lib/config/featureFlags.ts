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

export function isGradPlanV3Enabled(): boolean {
  return parseBooleanFlag(process.env.GRAD_PLAN_V3_ENABLED);
}

export function isGradPlanV3ClientEnabled(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_GRAD_PLAN_V3_ENABLED);
}

export function isGradPlanV3DevtoolsEnabled(): boolean {
  return parseBooleanFlag(process.env.GRAD_PLAN_V3_DEVTOOLS_ENABLED);
}

export function isGradPlanV3ClientDevtoolsEnabled(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_GRAD_PLAN_V3_DEVTOOLS_ENABLED);
}

export function isGradPlanV3LiveJobsEnabled(): boolean {
  return parseBooleanFlag(process.env.GRAD_PLAN_V3_LIVE_JOBS_ENABLED);
}

export function isGradPlanV3ClientMiniChatEnabled(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_GRAD_PLAN_V3_MINI_CHAT_ENABLED);
}
