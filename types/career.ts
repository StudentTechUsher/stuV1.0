/**
 * Assumptions:
 * - Education levels follow common U.S. degree classifications
 * - Salary data in USD
 * - Growth outlook uses simple categorical labels
 * - Related careers can be referenced by slug
 */

export type EducationLevel = 'BACHELOR' | 'MASTER' | 'PHD' | 'VARIES';
export type GrowthLabel = 'Declining' | 'Stable' | 'Growing' | 'Hot';
export type CareerStatus = 'PUBLISHED' | 'DRAFT';
export type UserRole = 'ADVISOR' | 'ADMIN' | 'STU';

export interface Career {
  id: string;
  slug: string; // "data-analyst"
  title: string; // "Data Analyst"
  shortOverview: string; // 1–2 sentences for card/teaser
  overview: string; // rich text (markdown allowed)
  education: {
    typicalLevel: EducationLevel;
    certifications?: string[];
  };
  bestMajors: Array<{ id: string; name: string }>;
  locationHubs: string[]; // e.g., ["Bay Area, CA", "NYC, NY", "Austin, TX"]
  salaryUSD: {
    entry?: number;
    median?: number;
    p90?: number;
    source?: string;
  };
  outlook: {
    growthLabel?: GrowthLabel;
    notes?: string;
    source?: string;
  };
  topSkills: string[]; // chips
  dayToDay: string[]; // bullet list
  recommendedCourses?: string[];
  internships?: string[];
  clubs?: string[];
  relatedCareers?: string[]; // slugs or free text
  links?: Array<{ label: string; url: string }>;
  lastUpdatedISO: string;
  status: CareerStatus;
  updatedBy?: {
    id: string;
    name: string;
    role: UserRole;
  };
}
