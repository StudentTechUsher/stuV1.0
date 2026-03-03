import { describe, expect, it } from 'vitest';
import { createInitialAgentContextSnapshot } from '@/lib/chatbot/grad-plan/v3/reducer';
import { heuristicVerificationSkill } from '@/lib/grad-plan/skills/heuristic-verification-skill';
import { remainingRequirementsSkill } from '@/lib/grad-plan/skills/remaining-requirements-skill';
import { runSkillPipeline } from '@/lib/grad-plan/skills/registry';
import { termEnvelopeSkill } from '@/lib/grad-plan/skills/term-envelope-skill';

describe('v3 runtime skills', () => {
  it('recomputes remaining credits from requirement-diff buckets', async () => {
    const snapshot = createInitialAgentContextSnapshot({
      courses: {
        selectedCourses: [],
        requestedElectives: [],
        requirementBuckets: [
          {
            bucketKey: 'major-core',
            bucketLabel: 'Major Core',
            requirementType: 'major',
            requiredCredits: 42,
            completedCredits: 9,
            remainingCredits: 33,
            candidateCourseCodes: ['CS240'],
          },
        ],
        remainingRequirementCredits: 0,
        requestedElectiveCredits: 3,
        totalCreditsToComplete: 0,
        totalSelectedCredits: 0,
      },
    });

    const result = await remainingRequirementsSkill.run({
      snapshot,
      draftPlan: null,
      phase: 'major_fill',
    });

    expect(result.updates.courses?.remainingRequirementCredits).toBe(33);
    expect(result.updates.courses?.totalCreditsToComplete).toBe(36);
  });

  it('flags term envelope violations', async () => {
    const snapshot = createInitialAgentContextSnapshot({
      distribution: {
        strategy: 'balanced',
        minCreditsPerTerm: 14,
        maxCreditsPerTerm: 17,
        targetCreditsPerTerm: 15,
        includeSecondaryTerms: false,
      },
    });

    const result = await termEnvelopeSkill.run({
      snapshot,
      phase: 'verify_heuristics',
      draftPlan: {
        terms: [
          {
            termId: 'fall-2026',
            termLabel: 'Fall 2026',
            plannedCourses: [
              { courseCode: 'CS101', credits: 3, source: 'major' },
              { courseCode: 'CS102', credits: 3, source: 'major' },
            ],
          },
        ],
      },
    });

    expect(result.checks.some((check) => check.id.startsWith('term-under-min'))).toBe(true);
  });

  it('detects duplicate and completed-course leakage in heuristics validation', async () => {
    const snapshot = createInitialAgentContextSnapshot({
      transcript: {
        choice: 'use_current',
        hasTranscript: true,
        transcriptRecordId: 'trx-1',
        completedCourseCodes: ['CS101'],
        lastEvaluatedAt: null,
      },
      distribution: {
        strategy: 'balanced',
        minCreditsPerTerm: 12,
        maxCreditsPerTerm: 18,
        targetCreditsPerTerm: 15,
        includeSecondaryTerms: false,
      },
      courses: {
        selectedCourses: [],
        requestedElectives: [],
        requirementBuckets: [
          {
            bucketKey: 'major-core',
            bucketLabel: 'Major Core',
            requirementType: 'major',
            requiredCredits: 12,
            completedCredits: 0,
            remainingCredits: 12,
            candidateCourseCodes: ['CS101', 'CS201'],
          },
        ],
        remainingRequirementCredits: 12,
        requestedElectiveCredits: 0,
        totalCreditsToComplete: 12,
        totalSelectedCredits: 0,
      },
    });

    const result = await heuristicVerificationSkill.run({
      snapshot,
      phase: 'verify_heuristics',
      draftPlan: {
        terms: [
          {
            termId: 'fall-2026',
            termLabel: 'Fall 2026',
            plannedCourses: [
              { courseCode: 'CS101', credits: 3, source: 'major' },
              { courseCode: 'CS201', credits: 3, source: 'major' },
            ],
          },
          {
            termId: 'spring-2027',
            termLabel: 'Spring 2027',
            plannedCourses: [
              { courseCode: 'CS101', credits: 3, source: 'major' },
            ],
          },
        ],
      },
    });

    const failedChecks = result.checks.filter((check) => check.status === 'fail').map((check) => check.id);
    expect(failedChecks).toContain('verify-duplicate-courses');
    expect(failedChecks).toContain('verify-completed-course-leakage');
  });

  it('runs pipeline and merges updates from all enabled skills', async () => {
    const snapshot = createInitialAgentContextSnapshot({
      courses: {
        selectedCourses: [],
        requestedElectives: [],
        requirementBuckets: [
          {
            bucketKey: 'gened',
            bucketLabel: 'Gen Ed',
            requirementType: 'gen_ed',
            requiredCredits: 6,
            completedCredits: 3,
            remainingCredits: 3,
            candidateCourseCodes: ['HIST150'],
          },
        ],
        remainingRequirementCredits: 0,
        requestedElectiveCredits: 3,
        totalCreditsToComplete: 0,
        totalSelectedCredits: 0,
      },
      distribution: {
        strategy: 'balanced',
        minCreditsPerTerm: 12,
        maxCreditsPerTerm: 18,
        targetCreditsPerTerm: 15,
        includeSecondaryTerms: false,
      },
    });

    const result = await runSkillPipeline({
      snapshot,
      phase: 'verify_heuristics',
      draftPlan: {
        terms: [
          {
            termId: 'fall-2026',
            termLabel: 'Fall 2026',
            plannedCourses: [{ courseCode: 'HIST150', credits: 3, source: 'gen_ed' }],
          },
        ],
      },
    });

    expect(result.mergedUpdates.courses?.remainingRequirementCredits).toBe(3);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});
