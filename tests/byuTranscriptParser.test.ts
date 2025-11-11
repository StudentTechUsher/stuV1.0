/**
 * Unit tests for BYU transcript parser
 */

import { describe, it, expect } from '@jest/globals';
import { parseByuTranscript, validateByuCourse, type ByuCourse } from '@/lib/transcript/byuParser';

describe('BYU Transcript Parser', () => {
  // Sample transcript text from the provided PDF
  const sampleTranscript = `
BYU COURSE WORK
 TEACH CRS SEC H COURSE DESCRIPTION SEM GRD
 AREA NO. NO. HRS

Summer Term 2020
 HIST 202 001 World Civilization from 1500 3.00 B+
 REL A 275 002 Tchgs & Doctrine of B of M 2.00 A-
SEM HR ERN 5.00 HR GRD 5.00 GPA 3.52

Fall Semester 2020
 ENT 381 001 Entrep Lecture Series 1.00 A
 MATH 112 016 Calculus 1 4.00 A
 MKTG 201 002 Marketing Management 3.00 A-
 PHY S 100 026 Physical Science 3.00 A
 REL C 130 013 Missionary Preparation 2.00 A
SEM HR ERN 13.00 HR GRD 13.00 GPA 3.93

Spring Term 2023
 ACC 200 002 Principles of Accounting 3.00 A
 IS 110 001 Spreadsheets & Bus Analysis 1.00 A
 IS 201 003 Intro to Mgt Info Systems 3.00 A
 ENT 113 001 Startup Bootcamp 1.00 P
SEM HR ERN 8.00 HR GRD 7.00 GPA 4.00

Winter Semester 2024
 GSCM 211 002 Intro to GSCM International 1.50 A-
 SWELL 162 001 Snowboarding 0.50 P
 GSCM 201 006 Intro Global Supply Chain Mgt 1.50 A
 ENT 411 002 Creating New Ventures 3.00 A
 M COM 320 004 Management Communication 3.00 A-
SEM HR ERN 17.50 HR GRD 17.00 GPA 3.92
`;

  describe('parseByuTranscript', () => {
    it('should parse courses from BYU transcript text', () => {
      const result = parseByuTranscript(sampleTranscript);

      expect(result.courses.length).toBeGreaterThan(0);
      expect(result.metadata.termsFound.length).toBeGreaterThan(0);
      expect(Object.keys(result.coursesByTerm).length).toBeGreaterThan(0);
    });

    it('should detect all terms in the transcript', () => {
      const result = parseByuTranscript(sampleTranscript);

      expect(result.metadata.termsFound).toContain('Summer 2020');
      expect(result.metadata.termsFound).toContain('Fall 2020');
      expect(result.metadata.termsFound).toContain('Spring 2023');
      expect(result.metadata.termsFound).toContain('Winter 2024');
    });

    it('should correctly parse a simple course', () => {
      const result = parseByuTranscript(sampleTranscript);
      const hist202 = result.courses.find(
        c => c.subject === 'HIST' && c.number === '202'
      );
      const summerCourses = result.coursesByTerm['Summer 2020'];

      expect(hist202).toBeDefined();
      expect(hist202?.title).toBe('World Civilization from 1500');
      expect(hist202?.credits).toBe(3.0);
      expect(hist202?.grade).toBe('B+');
      expect(hist202?.term).toBe('Summer 2020');
      expect(summerCourses?.some(course => course.subject === 'HIST' && course.number === '202')).toBe(true);
    });

    it('should correctly parse courses with multi-word subjects', () => {
      const result = parseByuTranscript(sampleTranscript);
      const fallCourses = result.coursesByTerm['Fall 2020'];

      // REL A (Religion)
      const relA = result.courses.find(
        c => c.subject === 'REL A' && c.number === '275'
      );
      expect(relA).toBeDefined();
      expect(relA?.title).toBe('Tchgs & Doctrine of B of M');

      // PHY S (Physical Science)
      const phyS = result.courses.find(
        c => c.subject === 'PHY S' && c.number === '100'
      );
      expect(phyS).toBeDefined();

      // M COM (Management Communication)
      const mCom = result.courses.find(
        c => c.subject === 'M COM' && c.number === '320'
      );
      expect(mCom).toBeDefined();

      expect(fallCourses).toBeDefined();
      expect(fallCourses?.length).toBeGreaterThan(0);
    });

    it('should handle pass/fail grades', () => {
      const result = parseByuTranscript(sampleTranscript);
      const bootcamp = result.courses.find(
        c => c.subject === 'ENT' && c.number === '113'
      );

      expect(bootcamp).toBeDefined();
      expect(bootcamp?.grade).toBe('P');
    });

    it('should handle courses with decimal credits', () => {
      const result = parseByuTranscript(sampleTranscript);
      const snowboarding = result.courses.find(
        c => c.subject === 'SWELL' && c.number === '162'
      );

      expect(snowboarding).toBeDefined();
      expect(snowboarding?.credits).toBe(0.5);
    });

    it('should skip summary lines', () => {
      const result = parseByuTranscript(sampleTranscript);

      // Make sure we don't parse summary lines as courses
      const hasSummary = result.courses.some(
        c => c.subject.includes('SEM') || c.subject.includes('GPA')
      );
      expect(hasSummary).toBe(false);
    });
  });

  describe('validateByuCourse', () => {
    it('should validate a correct course', () => {
      const course: ByuCourse = {
        term: 'Fall 2020',
        subject: 'CS',
        number: '142',
        title: 'Introduction to Programming',
        credits: 3.0,
        grade: 'A',
      };

      expect(validateByuCourse(course)).toBe(true);
    });

    it('should validate courses with multi-word subjects', () => {
      const course: ByuCourse = {
        term: 'Fall 2020',
        subject: 'REL A',
        number: '275',
        title: 'Teachings of the Book of Mormon',
        credits: 2.0,
        grade: 'A',
      };

      expect(validateByuCourse(course)).toBe(true);
    });

    it('should validate courses with null grades (current enrollment)', () => {
      const course: ByuCourse = {
        term: 'Fall 2025',
        subject: 'CS',
        number: '142',
        title: 'Introduction to Programming',
        credits: 3.0,
        grade: null,
      };

      expect(validateByuCourse(course)).toBe(true);
    });

    it('should reject courses with invalid course numbers', () => {
      const course: ByuCourse = {
        term: 'Fall 2020',
        subject: 'CS',
        number: '42', // Too short
        title: 'Introduction to Programming',
        credits: 3.0,
        grade: 'A',
      };

      expect(validateByuCourse(course)).toBe(false);
    });

    it('should reject courses with invalid credits', () => {
      const course: ByuCourse = {
        term: 'Fall 2020',
        subject: 'CS',
        number: '142',
        title: 'Introduction to Programming',
        credits: -1, // Negative credits
        grade: 'A',
      };

      expect(validateByuCourse(course)).toBe(false);
    });

    it('should reject courses with invalid grades', () => {
      const course: ByuCourse = {
        term: 'Fall 2020',
        subject: 'CS',
        number: '142',
        title: 'Introduction to Programming',
        credits: 3.0,
        grade: 'Z', // Invalid grade
      };

      expect(validateByuCourse(course)).toBe(false);
    });

    it('should reject courses with empty titles', () => {
      const course: ByuCourse = {
        term: 'Fall 2020',
        subject: 'CS',
        number: '142',
        title: '',
        credits: 3.0,
        grade: 'A',
      };

      expect(validateByuCourse(course)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle transcript without term headers', () => {
      const text = `
BYU COURSE WORK
 CS 142 001 Intro to Programming 3.00 A
 MATH 112 001 Calculus 1 4.00 B+
`;

      const result = parseByuTranscript(text);
      expect(result.courses.length).toBeGreaterThan(0);
      // Courses without term headers should have "Unknown" as term
      expect(result.courses[0].term).toBe('Unknown');
      expect(result.coursesByTerm['Unknown']).toBeDefined();
    });

    it('should handle empty transcript', () => {
      const result = parseByuTranscript('');

      expect(result.courses.length).toBe(0);
      expect(result.metadata.coursesFound).toBe(0);
    });

    it('should handle transcript with only headers', () => {
      const text = `
BYU COURSE WORK
 TEACH CRS SEC H COURSE DESCRIPTION SEM GRD
 AREA NO. NO. HRS
`;

      const result = parseByuTranscript(text);
      expect(result.courses.length).toBe(0);
    });
  });
});
