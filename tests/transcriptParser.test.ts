import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseTranscriptText,
  validateCourse,
  yrtrmToTerm,
} from '@/lib/transcript/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadSampleTranscript() {
  const fixturePath = resolve(
    __dirname,
    '../transcript-parser/tests/fixtures/byu_sample.txt'
  );
  return readFileSync(fixturePath, 'utf8');
}

describe('transcript parser', () => {
  const transcriptText = loadSampleTranscript();
  const { courses, metadata } = parseTranscriptText(transcriptText);

  it('detects terms and metadata', () => {
    expect(metadata.coursesFound).toBeGreaterThan(0);
    expect(metadata.termsFound).toContain('Summer Term 2020');
    expect(metadata.termsFound).toContain('Fall Semester 2025');
    expect(metadata.totalLines).toBeGreaterThan(10);
  });

  it('parses BYU courses with section numbers', () => {
    const math112 = courses.find(
      (course) => course.subject === 'MATH' && course.number === '112'
    );
    expect(math112).toBeDefined();
    expect(math112?.credits).toEqual(4);
    expect(math112?.grade).toEqual('A');
    expect(math112?.title).toContain('Calculus');
  });

  it('parses AP and transfer credit rows', () => {
    const apBio = courses.find(
      (course) => course.subject === 'BIO' && course.number === '100'
    );
    expect(apBio).toBeDefined();
    expect(apBio?.grade).toEqual('P');

    const transferMath = courses.find(
      (course) => course.subject === 'MATH' && course.number === '153'
    );
    expect(transferMath).toBeDefined();
    expect(transferMath?.term).toContain('2017');
    expect(transferMath?.confidence).toEqual(0.75);
  });

  it('validates courses using the same rules as the Python parser', () => {
    expect(courses.filter(validateCourse)).not.toHaveLength(0);
  });

  it('converts YRTRM codes to friendly terms', () => {
    expect(yrtrmToTerm('20175')).toEqual('Summer Term 2017');
    expect(yrtrmToTerm('20201')).toEqual('Winter Term 2020');
    expect(yrtrmToTerm('20209')).toEqual('Fall Term 2020');
  });
});

