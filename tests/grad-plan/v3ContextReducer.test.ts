import { describe, expect, it } from 'vitest';
import {
  applyContextEvent,
  createInitialAgentContextSnapshot,
  reduceContextEvents,
} from '@/lib/chatbot/grad-plan/v3/reducer';
import type { StoredContextEvent } from '@/lib/chatbot/grad-plan/v3/types';

function event(overrides: Partial<StoredContextEvent>): StoredContextEvent {
  return {
    sequenceId: 1,
    id: 'evt-1',
    sessionId: 'session-1',
    schemaVersion: 1,
    type: 'profile_confirmed',
    actor: 'user',
    createdAt: '2026-02-26T12:00:00.000Z',
    payload: {
      confirmed: true,
      studentType: 'undergraduate',
      admissionYear: 2024,
      estimatedGraduationTerm: 'Spring',
      estimatedGraduationYear: 2028,
    },
    ...overrides,
  } as StoredContextEvent;
}

describe('v3 context reducer', () => {
  it('applies generation completion to 100 percent and stores output access id', () => {
    const initial = createInitialAgentContextSnapshot();

    const next = applyContextEvent(initial, {
      id: 'evt-complete',
      sessionId: 'session-1',
      schemaVersion: 1,
      type: 'generation_completed',
      actor: 'agent',
      createdAt: '2026-02-26T12:00:10.000Z',
      payload: {
        outputAccessId: 'access-123',
        message: 'done',
      },
    });

    expect(next.generation.status).toBe('completed');
    expect(next.generation.phase).toBe('completed');
    expect(next.generation.progressPercent).toBe(100);
    expect(next.generation.outputAccessId).toBe('access-123');
  });

  it('reduces events in sequence order and deduplicates by idempotency key', () => {
    const events = [
      event({
        sequenceId: 2,
        id: 'evt-2',
        type: 'generation_mode_selected',
        payload: { style: 'automatic' },
        idempotencyKey: 'mode',
      }),
      event({
        sequenceId: 3,
        id: 'evt-3',
        type: 'generation_mode_selected',
        payload: { style: 'active_feedback' },
        idempotencyKey: 'mode',
      }),
      event({
        sequenceId: 1,
        id: 'evt-1',
        type: 'transcript_choice_set',
        payload: {
          choice: 'use_current',
          completedCourseCodes: ['ENGL101'],
        },
      }),
    ];

    const reduced = reduceContextEvents(events, createInitialAgentContextSnapshot());

    expect(reduced.transcript.choice).toBe('use_current');
    expect(reduced.generation.style).toBe('automatic');
  });

  it('keeps generation progress monotonic during running phases', () => {
    const initial = createInitialAgentContextSnapshot({
      generation: {
        style: 'automatic',
        status: 'running',
        phase: 'major_fill',
        progressPercent: 60,
        message: null,
        jobId: 'job-1',
        outputAccessId: null,
        errorCode: null,
        errorMessage: null,
        repairLoopCount: 0,
        lastEventAt: null,
      },
    });

    const next = applyContextEvent(initial, {
      id: 'evt-4',
      sessionId: 'session-1',
      schemaVersion: 1,
      type: 'generation_phase_updated',
      actor: 'agent',
      createdAt: '2026-02-26T12:00:15.000Z',
      payload: {
        phase: 'gen_ed_fill',
        status: 'running',
        progressPercent: 55,
      },
    });

    expect(next.generation.progressPercent).toBe(60);
  });

  it('tracks mini chat command lifecycle and clears pending command when applied', () => {
    const initial = createInitialAgentContextSnapshot({
      generation: {
        style: 'automatic',
        status: 'running',
        phase: 'major_fill',
        progressPercent: 35,
        message: null,
        jobId: 'job-1',
        outputAccessId: null,
        errorCode: null,
        errorMessage: null,
        repairLoopCount: 0,
        lastEventAt: null,
      },
    });

    const withCommandRequest = applyContextEvent(initial, {
      id: 'evt-command-request',
      sessionId: 'session-1',
      schemaVersion: 1,
      type: 'generation_command_requested',
      actor: 'user',
      createdAt: '2026-02-26T12:01:00.000Z',
      payload: {
        commandId: 'cmd-1',
        commandType: 'pause',
        jobId: 'job-1',
      },
    });

    expect(withCommandRequest.miniChat.pendingCommand).toBe('pause');
    expect(withCommandRequest.generation.status).toBe('pause_requested');

    const withCommandApplied = applyContextEvent(withCommandRequest, {
      id: 'evt-command-applied',
      sessionId: 'session-1',
      schemaVersion: 1,
      type: 'generation_command_applied',
      actor: 'system',
      createdAt: '2026-02-26T12:01:02.000Z',
      payload: {
        commandId: 'cmd-1',
        commandType: 'pause',
        outcome: 'applied',
        message: 'Paused at boundary',
        jobId: 'job-1',
      },
    });

    expect(withCommandApplied.miniChat.pendingCommand).toBeNull();
    expect(withCommandApplied.generation.status).toBe('paused');
  });
});
