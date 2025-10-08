/**
 * Comprehensive Major Information Type
 * Similar to Career type, provides rich information about academic majors
 */

export type DegreeType = 'BS' | 'BA' | 'BFA' | 'VARIES';
export type MajorStatus = 'PUBLISHED' | 'DRAFT';
export type UserRole = 'ADVISOR' | 'ADMIN' | 'STU';

export interface CourseEquivalency {
  institutionCourse: string; // e.g., "CS 111"
  equivalentCourses: string[]; // e.g., ["IS 303", "IT 120"]
  notes?: string; // Optional explanation
}

export interface MajorInfo {
  id: string;
  slug: string; // "computer-science"
  name: string; // "Computer Science"
  degreeType: DegreeType;
  shortOverview: string; // 1-2 sentences for card/teaser
  overview: string; // Rich text (markdown allowed)

  // Career information
  topCareers: Array<{ slug: string; title: string }>; // Top 5-7 careers this major leads to
  careerOutlook: string; // 1-2 sentences about job prospects

  // Academic details
  totalCredits: number; // e.g., 120
  typicalDuration: string; // e.g., "4 years"
  coreCourses: string[]; // e.g., ["CS 142", "CS 235", "CS 236"]
  electiveCourses?: string[]; // Common elective options
  courseEquivalencies: CourseEquivalency[]; // Cross-listing and equivalencies

  // Prerequisites and requirements
  prerequisites: string[]; // Courses needed before declaring
  mathRequirements?: string; // e.g., "Calculus I & II required"
  otherRequirements?: string; // e.g., "Minimum 3.0 GPA"

  // Skills and outcomes
  topSkills: string[]; // Key skills developed (5-8 skills)
  learningOutcomes: string[]; // What students will be able to do (4-6 outcomes)

  // Opportunities
  internshipOpportunities?: string[];
  researchAreas?: string[];
  studyAbroadOptions?: string[];
  clubs?: string[];

  // Related programs
  relatedMajors?: string[]; // Slugs of related majors
  commonMinors?: string[]; // Popular minor pairings
  dualDegreeOptions?: string[];

  // Resources
  departmentWebsite?: string;
  advisingContact?: string;
  links?: Array<{ label: string; url: string }>;

  // Metadata
  lastUpdatedISO: string;
  status: MajorStatus;
  updatedBy?: {
    id: string;
    name: string;
    role: UserRole;
  };
}
