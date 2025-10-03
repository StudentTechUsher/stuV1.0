/**
 * Mock data generator for forecasting PoC
 * Deterministic based on institution + term for stable estimates
 */

export interface MockCourse {
  course_id: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  demand_count: number;
  detail?: {
    time_of_day: { morning: number; afternoon: number; evening: number };
    modality: { in_person: number; online: number; hybrid: number };
    professors: string[];
  };
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Generate mock forecast data
 */
export function generateMockForecast(params: {
  institutionId: number;
  termCodes: string[];
  courses: Array<{ id: string; subject: string; number: string; title: string; credits: number }>;
  includeDetail: boolean;
}): MockCourse[] {
  const { institutionId, termCodes, courses, includeDetail } = params;

  // Create seed from institution + first term
  const seed = institutionId * 10000 + termCodes.join("").split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const rand = seededRandom(seed);

  return courses.map((course) => {
    // Weight upper-division courses higher
    const courseNumber = parseInt(course.number, 10);
    const isUpperDiv = courseNumber >= 300;
    const baseDemand = isUpperDiv ? 40 : 25;
    const variance = isUpperDiv ? 50 : 30;

    // Generate demand with some randomness
    const demandCount = Math.max(5, Math.min(120, Math.floor(baseDemand + rand() * variance)));

    const mockCourse: MockCourse = {
      course_id: course.id,
      subject: course.subject,
      number: course.number,
      title: course.title,
      credits: course.credits,
      demand_count: demandCount,
    };

    // Add detail for 1-semester-ahead
    if (includeDetail) {
      // Time of day split: morning 30%, afternoon 50%, evening 20%
      const morning = Math.floor(demandCount * (0.25 + rand() * 0.1));
      const evening = Math.floor(demandCount * (0.15 + rand() * 0.1));
      const afternoon = demandCount - morning - evening;

      // Modality: in-person 60%, online 30%, hybrid 10%
      const inPerson = Math.floor(demandCount * (0.55 + rand() * 0.1));
      const hybrid = Math.floor(demandCount * (0.08 + rand() * 0.04));
      const online = demandCount - inPerson - hybrid;

      // Generate mock professor names
      const profCount = Math.min(5, Math.ceil(demandCount / 20));
      const professors: string[] = [];
      for (let i = 0; i < profCount; i++) {
        professors.push(`Professor ${String.fromCharCode(65 + Math.floor(rand() * 26))}`);
      }

      mockCourse.detail = {
        time_of_day: { morning, afternoon, evening },
        modality: { in_person: inPerson, online, hybrid },
        professors,
      };
    }

    return mockCourse;
  });
}
