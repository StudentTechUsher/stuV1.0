import type { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import type { MessagePart, ToolCallPart, ToolResultPart } from './types';

export type ToolKind = 'user' | 'client_auto' | 'server_auto';
export type ToolMode = 'parts' | 'legacy';

export type ToolRegistryItem = {
  name: ToolType;
  label: string;
  kind: ToolKind;
  mode: ToolMode;
  summaryBuilder?: (result: unknown) => string;
};

const TOOL_REGISTRY: Record<ToolType, ToolRegistryItem> = {
  profile_update: {
    name: 'profile_update',
    label: 'Update Profile',
    kind: 'user',
    mode: 'legacy',
  },
  profile_check: {
    name: 'profile_check',
    label: 'Profile Check',
    kind: 'user',
    mode: 'parts',
  },
  transcript_check: {
    name: 'transcript_check',
    label: 'Transcript Check',
    kind: 'user',
    mode: 'legacy',
  },
  student_type: {
    name: 'student_type',
    label: 'Student Type',
    kind: 'user',
    mode: 'legacy',
  },
  career_pathfinder: {
    name: 'career_pathfinder',
    label: 'Career Pathfinder',
    kind: 'user',
    mode: 'legacy',
  },
  program_pathfinder: {
    name: 'program_pathfinder',
    label: 'Program Pathfinder',
    kind: 'user',
    mode: 'legacy',
  },
  program_selection: {
    name: 'program_selection',
    label: 'Program Selection',
    kind: 'user',
    mode: 'parts',
  },
  course_selection: {
    name: 'course_selection',
    label: 'Course Selection',
    kind: 'user',
    mode: 'parts',
  },
  credit_distribution: {
    name: 'credit_distribution',
    label: 'Credit Distribution',
    kind: 'user',
    mode: 'parts',
  },
  milestones: {
    name: 'milestones',
    label: 'Milestones',
    kind: 'user',
    mode: 'legacy',
  },
  milestones_and_constraints: {
    name: 'milestones_and_constraints',
    label: 'Milestones & Constraints',
    kind: 'user',
    mode: 'legacy',
  },
  additional_concerns: {
    name: 'additional_concerns',
    label: 'Additional Concerns',
    kind: 'user',
    mode: 'legacy',
  },
  career_suggestions: {
    name: 'career_suggestions',
    label: 'Career Suggestions',
    kind: 'client_auto',
    mode: 'legacy',
  },
  program_suggestions: {
    name: 'program_suggestions',
    label: 'Program Suggestions',
    kind: 'client_auto',
    mode: 'legacy',
  },
  generate_plan_confirmation: {
    name: 'generate_plan_confirmation',
    label: 'Generate Plan',
    kind: 'user',
    mode: 'legacy',
  },
  active_feedback_plan: {
    name: 'active_feedback_plan',
    label: 'Active Feedback',
    kind: 'user',
    mode: 'legacy',
  },
};

export function getToolMeta(toolName: ToolType): ToolRegistryItem {
  return TOOL_REGISTRY[toolName];
}

let toolCallCounter = 0;

export function generateToolCallId(): string {
  toolCallCounter += 1;
  return `toolcall-${Date.now()}-${toolCallCounter}`;
}

export function createToolCallPart(
  toolName: ToolType,
  args: Record<string, unknown>,
  toolCallId: string
): ToolCallPart {
  return {
    type: 'tool-call',
    toolName,
    toolCallId,
    args,
  };
}

export function createToolResultPart(
  toolName: ToolType,
  toolCallId: string,
  result: unknown,
  isError = false
): ToolResultPart {
  return {
    type: 'tool-result',
    toolName,
    toolCallId,
    result,
    isError,
  };
}

export function isToolCallPart(part: MessagePart): part is ToolCallPart {
  return part.type === 'tool-call';
}

export function isToolResultPart(part: MessagePart): part is ToolResultPart {
  return part.type === 'tool-result';
}
