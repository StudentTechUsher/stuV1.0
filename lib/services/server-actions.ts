'use server';

// Centralized async server action wrappers. Each export must be an async function (Next.js requirement).

import { decodeAnyAccessId, encodeAccessId } from '@/lib/utils/access-id';
import { OrganizeCoursesIntoSemesters_ServerAction } from './openaiService';
import {
    fetchGradPlanForEditing as _fetchGradPlanForEditing,
    fetchGradPlanById as _fetchGradPlanById,
    fetchPendingGradPlans as _fetchPendingGradPlans,
    updateGradPlanWithAdvisorNotes as _updateGradPlanWithAdvisorNotes,
    approveGradPlan as _approveGradPlan,
    submitGradPlanForApproval as _submitGradPlanForApproval,
} from './gradPlanService';
import {
    fetchProgramsByUniversity as _fetchProgramsByUniversity,
    deleteProgram as _deleteProgram,
} from './programService';

// AI organize courses (directly re-exported earlier - now wrapped for consistency if future decoration needed)
export async function organizeCoursesIntoSemestersAction(coursesData: unknown, prompt: any) {
    return await OrganizeCoursesIntoSemesters_ServerAction(coursesData, prompt);
}

// Decode access ID
export async function decodeAccessIdServerAction(accessId: string): Promise<{ success: boolean; gradPlanId?: string; error?: string }> {
    try {
        // Accept both server (HMAC) and legacy client formats. Enforce 30-day max age for legacy tokens.
        const gradPlanId = decodeAnyAccessId(accessId, { maxAgeMs: 1000 * 60 * 60 * 24 * 30 });
        if (!gradPlanId) return { success: false, error: 'Invalid or expired access link' };
        return { success: true, gradPlanId };
    } catch (error) {
        console.error('Error decoding access ID:', error);
        return { success: false, error: 'Failed to decode access ID' };
    }
}

// Grad plan related
export async function fetchGradPlanForEditing(gradPlanId: string) {
    return await _fetchGradPlanForEditing(gradPlanId);
}

export async function fetchGradPlanById(gradPlanId: string) {
    return await _fetchGradPlanById(gradPlanId);
}

export async function fetchPendingGradPlans() {
    return await _fetchPendingGradPlans();
}

export async function updateGradPlanWithAdvisorNotes(gradPlanId: string, advisorNotes: string) {
    return await _updateGradPlanWithAdvisorNotes(gradPlanId, advisorNotes);
}

export async function approveGradPlan(gradPlanId: string) {
    return await _approveGradPlan(gradPlanId);
}

export async function submitGradPlanForApproval(userId: string, planData: any, programIds: number[]) {
    return await _submitGradPlanForApproval(userId, planData, programIds);
}

// Program related
export async function fetchProgramsByUniversity(universityId: number) {
    return await _fetchProgramsByUniversity(universityId);
}

export async function deleteProgram(programId: string) {
    return await _deleteProgram(programId);
}

// Issue a server-format access ID (HMAC) for a grad plan id
export async function issueGradPlanAccessId(gradPlanId: string): Promise<string> {
    return encodeAccessId(gradPlanId);
}
