/**
 * Course Recommendation Service
 * Recommends elective and gen-ed courses based on student's career goals and interests
 */

export interface CourseRecommendationContext {
  careerGoals: string | null; // e.g., "Technology & Software | Finance | Commitment Level: 8/10"
  studentInterests: string | null; // e.g., "Football | Data Science | Photography"
  selectedMajorMinors: string[]; // Course codes or names of selected programs
}

export interface CourseRecommendation {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  score: number; // 0-3
  matchReasons: string[]; // Why this course was recommended
}

/**
 * Extract keywords from career goals and interests
 */
function extractCareerKeywords(careerGoals: string | null): string[] {
  if (!careerGoals) return [];

  const keywords: string[] = [];

  // Remove "Commitment Level: X/10" part
  const cleanGoals = careerGoals.split(' | ').filter(g => !g.includes('Commitment Level'));

  cleanGoals.forEach(goal => {
    // Split compound goals like "Technology & Software" into individual keywords
    const parts = goal.split('&').map(p => p.trim().toLowerCase());
    keywords.push(...parts);
  });

  return keywords;
}

/**
 * Extract keywords from interests
 */
function extractInterestKeywords(studentInterests: string | null): string[] {
  if (!studentInterests) return [];

  return studentInterests
    .split(' | ')
    .map(interest => interest.trim().toLowerCase());
}

/**
 * Check if course description/title contains relevant keywords
 */
function countMatches(
  courseTitle: string,
  courseDescription: string,
  keywords: string[]
): number {
  if (keywords.length === 0) return 0;

  const fullText = `${courseTitle} ${courseDescription}`.toLowerCase();

  let matches = 0;
  for (const keyword of keywords) {
    // Check for exact word matches or partial matches for compound keywords
    if (fullText.includes(keyword)) {
      matches++;
    }
  }

  return Math.min(matches, 1); // Cap at 1 match per criterion (career or interest)
}

/**
 * AUTHORIZATION: ANY
 * Recommends courses based on student's career goals, interests, and program overlap
 * @param courses - Available courses to evaluate
 * @param context - Student's career goals, interests, and selected programs
 * @returns Ranked list of course recommendations
 */
export function recommendCourses(
  courses: Array<{
    id: string;
    code: string;
    title: string;
    description?: string;
    credits?: number;
  }>,
  context: CourseRecommendationContext
): CourseRecommendation[] {
  const careerKeywords = extractCareerKeywords(context.careerGoals);
  const interestKeywords = extractInterestKeywords(context.studentInterests);

  // Score each course
  const recommendations: CourseRecommendation[] = courses
    .filter(course => course.title && course.code) // Filter out courses with missing title or code
    .map(course => {
    const courseTitle = course.title.toLowerCase();
    const courseDesc = (course.description || '').toLowerCase();
    const matchReasons: string[] = [];
    let score = 0;

    // Check for career goal matches (1 point max)
    const careerMatches = countMatches(courseTitle, courseDesc, careerKeywords);
    if (careerMatches > 0) {
      score += 1;
      matchReasons.push('Aligns with your career goals');
    }

    // Check for interest matches (1 point max)
    const interestMatches = countMatches(courseTitle, courseDesc, interestKeywords);
    if (interestMatches > 0) {
      score += 1;
      matchReasons.push('Matches your interests');
    }

    // Check if course is likely in selected major/minor (1 point max)
    // This is a simple heuristic - if the course code matches program codes, boost score
    const courseCode = course.code.toLowerCase();
    const programMatch = context.selectedMajorMinors.some(
      program => courseCode.includes(program.toLowerCase()) ||
                  program.toLowerCase().includes(courseCode)
    );

    if (programMatch) {
      score += 1;
      matchReasons.push('Counts toward your major/minor');
    }

    return {
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      score,
      matchReasons,
    };
  });

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get top N recommendations and categorize remaining courses
 */
export function getTopRecommendations(
  recommendations: CourseRecommendation[],
  topN: number = 3
): {
  topRecommendations: CourseRecommendation[];
  otherCourses: CourseRecommendation[];
} {
  return {
    topRecommendations: recommendations.slice(0, topN),
    otherCourses: recommendations.slice(topN),
  };
}
