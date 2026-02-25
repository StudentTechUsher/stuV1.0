import { ToolNode, ToolEdge, FlowGraph } from './types';

// Category colors
export const CATEGORY_COLORS = {
  core: '#37DBC3',
  optional: '#F59E0B',
  hypothetical: '#A855F7',
  data: '#3B82F6',        // blue for data-layer tools
} as const;

// Node dimensions for edge calculations
export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 120;
export const PORT_RADIUS = 6;

// ─── Seed Nodes ─────────────────────────────────────────────────────────────────

const DATA_X = 120;        // Data-layer tools column (left of core pipeline)
const CORE_X = 450;
const OPTIONAL_X = 780;
const Y_SPACING = 160;

export const SEED_NODES: ToolNode[] = [
  // ── Data Layer (infrastructure tools) ──────────────────────────────────────
  {
    id: 'fetch_programs',
    name: 'Fetch Programs',
    toolType: 'fetch_programs',
    category: 'data',
    color: CATEGORY_COLORS.data,
    position: { x: DATA_X, y: 40 + Y_SPACING * 5 },
    description: 'Fetches available programs from database filtered by university, student type, admission year, and transfer status.',
    inputs: [
      { id: 'fp-in-universityId', name: 'universityId', type: 'number', required: true },
      { id: 'fp-in-type', name: 'type', type: "'major' | 'minor' | 'gen_ed' | 'honors'" },
      { id: 'fp-in-admissionYear', name: 'studentAdmissionYear', type: 'number' },
      { id: 'fp-in-isTransfer', name: 'studentIsTransfer', type: 'boolean' },
    ],
    outputs: [
      { id: 'fp-out-programs', name: 'programs', type: 'ProgramRow[]' },
    ],
  },
  {
    id: 'fetch_course_offerings',
    name: 'Fetch Course Offerings',
    toolType: 'fetch_course_offerings',
    category: 'data',
    color: CATEGORY_COLORS.data,
    position: { x: DATA_X, y: 40 + Y_SPACING * 6 },
    description: 'Searches course offerings and fetches sections for specific courses, terms, and universities.',
    inputs: [
      { id: 'fco-in-universityId', name: 'universityId', type: 'number', required: true },
      { id: 'fco-in-searchTerm', name: 'searchTerm', type: 'string' },
      { id: 'fco-in-termName', name: 'termName', type: 'string' },
      { id: 'fco-in-courseCode', name: 'courseCode', type: 'string' },
    ],
    outputs: [
      { id: 'fco-out-offerings', name: 'offerings', type: 'CourseOffering[]' },
      { id: 'fco-out-sections', name: 'sections', type: 'CourseSection[]' },
    ],
  },
  {
    id: 'vector_search',
    name: 'Vector Search',
    toolType: 'vector_search',
    category: 'hypothetical',
    color: CATEGORY_COLORS.hypothetical,
    position: { x: DATA_X, y: 40 + Y_SPACING * 5.5 },
    description: 'Hypothetical semantic search tool using pgvector for natural language queries across programs, courses, and careers.',
    inputs: [
      { id: 'vs-in-query', name: 'query', type: 'string', required: true },
      { id: 'vs-in-table', name: 'table', type: "'programs' | 'course_offerings' | 'careers'" },
      { id: 'vs-in-limit', name: 'limit', type: 'number' },
      { id: 'vs-in-universityId', name: 'universityId', type: 'number' },
    ],
    outputs: [
      { id: 'vs-out-results', name: 'results', type: '{ similarity_score: number, matchedRow: any }[]' },
    ],
  },

  // ── Core Pipeline (vertical flow) ──────────────────────────────────────────
  {
    id: 'student_type',
    name: 'Student Type',
    toolType: 'student_type',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 },
    description: 'Initial step: asks whether student is undergraduate, honors, or graduate.',
    inputs: [
      { id: 'st-in-trigger', name: 'conversationStart', type: 'void' },
    ],
    outputs: [
      { id: 'st-out-studentType', name: 'studentType', type: "'undergraduate' | 'honor' | 'graduate'" },
    ],
  },
  {
    id: 'profile_check',
    name: 'Profile Check',
    toolType: 'profile_check',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING },
    description: 'Validates and collects student profile data: graduation date, career goals, admission info, student type.',
    inputs: [
      { id: 'pc-in-userId', name: 'userId', type: 'string', required: true },
      { id: 'pc-in-universityId', name: 'universityId', type: 'number' },
      { id: 'pc-in-studentType', name: 'studentType', type: 'string' },
    ],
    outputs: [
      { id: 'pc-out-studentType', name: 'studentType', type: "'undergraduate' | 'honor' | 'graduate'" },
      { id: 'pc-out-admissionYear', name: 'admissionYear', type: 'number' },
      { id: 'pc-out-careerGoals', name: 'careerGoals', type: 'string | null' },
      { id: 'pc-out-genEdProgramId', name: 'selectedGenEdProgramId', type: 'number | null' },
      { id: 'pc-out-isTransfer', name: 'isTransfer', type: "'freshman' | 'transfer' | 'dual_enrollment'" },
    ],
  },
  {
    id: 'transcript_check',
    name: 'Transcript Check',
    toolType: 'transcript_check',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 2 },
    description: 'Checks whether the student has an existing transcript and offers upload/update options.',
    inputs: [
      { id: 'tc-in-hasCourses', name: 'hasCourses', type: 'boolean', required: true },
      { id: 'tc-in-academicTerms', name: 'academicTerms', type: 'AcademicTermsConfig' },
    ],
    outputs: [
      { id: 'tc-out-hasTranscript', name: 'hasTranscript', type: 'boolean' },
      { id: 'tc-out-wantsToUpload', name: 'wantsToUpload', type: 'boolean' },
      { id: 'tc-out-wantsToUpdate', name: 'wantsToUpdate', type: 'boolean' },
    ],
  },
  {
    id: 'transcript_upload',
    name: 'Transcript Upload (OCR)',
    toolType: 'transcript_upload',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 3 },
    description: 'PDF upload with OCR and AI-powered parsing to extract courses, grades, credits, and terms.',
    isConditional: true,
    inputs: [
      { id: 'tu-in-pdfFile', name: 'transcriptPDF', type: 'File', required: true },
      { id: 'tu-in-userId', name: 'userId', type: 'string', required: true },
    ],
    outputs: [
      { id: 'tu-out-courses', name: 'parsedCourses', type: 'ParsedCourse[]' },
      { id: 'tu-out-report', name: 'parsingReport', type: '{ courses_found, terms_detected }' },
    ],
  },
  {
    id: 'transcript_review',
    name: 'Transcript Review',
    toolType: 'transcript_review',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 4 },
    description: 'Review and confirm AI-parsed courses grouped by term before proceeding.',
    isConditional: true,
    inputs: [
      { id: 'tr-in-courses', name: 'parsedCourses', type: 'ParsedCourse[]', required: true },
    ],
    outputs: [
      { id: 'tr-out-confirmed', name: 'coursesConfirmed', type: 'boolean' },
      { id: 'tr-out-totalCredits', name: 'totalCompletedCredits', type: 'number' },
    ],
  },
  {
    id: 'program_selection',
    name: 'Program Selection',
    toolType: 'program_selection',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 5 },
    description: 'Allows student to select majors, minors, gen-ed, and honors programs based on student type and university.',
    inputs: [
      { id: 'ps-in-studentType', name: 'studentType', type: 'string', required: true },
      { id: 'ps-in-universityId', name: 'universityId', type: 'number', required: true },
      { id: 'ps-in-admissionYear', name: 'admissionYear', type: 'number' },
      { id: 'ps-in-isTransfer', name: 'isTransfer', type: 'string' },
      { id: 'ps-in-genEdProgramId', name: 'selectedGenEdProgramId', type: 'number | null' },
    ],
    outputs: [
      { id: 'ps-out-majorIds', name: 'majorIds', type: 'string[]' },
      { id: 'ps-out-minorIds', name: 'minorIds', type: 'string[]' },
      { id: 'ps-out-genEdIds', name: 'genEdIds', type: 'string[]' },
      { id: 'ps-out-selectedPrograms', name: 'selectedPrograms', type: 'ProgramSelection[]' },
    ],
  },
  {
    id: 'course_selection',
    name: 'Course Selection',
    toolType: 'course_selection',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 6 },
    description: 'Fetches required courses for selected programs and lets student pick courses per requirement.',
    inputs: [
      { id: 'cs-in-programIds', name: 'selectedProgramIds', type: 'number[]', required: true },
      { id: 'cs-in-genEdIds', name: 'genEdProgramIds', type: 'number[]' },
      { id: 'cs-in-hasTranscript', name: 'hasTranscript', type: 'boolean' },
      { id: 'cs-in-careerGoals', name: 'careerGoals', type: 'string | null' },
    ],
    outputs: [
      { id: 'cs-out-courses', name: 'selectedCourses', type: 'CourseSelection[]' },
      { id: 'cs-out-totalCredits', name: 'totalSelectedCredits', type: 'number' },
      { id: 'cs-out-electives', name: 'electiveCourses', type: 'ElectiveCourse[]' },
    ],
  },
  {
    id: 'credit_distribution',
    name: 'Credit Distribution',
    toolType: 'credit_distribution',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 7 },
    description: 'Distributes total credits across academic terms using fast-track, balanced, or explore strategy.',
    inputs: [
      { id: 'cd-in-totalCredits', name: 'totalCredits', type: 'number', required: true },
      { id: 'cd-in-academicTerms', name: 'academicTerms', type: 'AcademicTermsConfig', required: true },
      { id: 'cd-in-studentData', name: 'studentData', type: '{ admission_year, est_grad_date }' },
    ],
    outputs: [
      { id: 'cd-out-strategy', name: 'strategy', type: "'fast_track' | 'balanced' | 'explore'" },
      { id: 'cd-out-distribution', name: 'suggestedDistribution', type: 'SemesterAllocation[]' },
      { id: 'cd-out-termIds', name: 'selectedTermIds', type: 'string[]' },
    ],
  },
  {
    id: 'milestones',
    name: 'Milestones & Constraints',
    toolType: 'milestones_and_constraints',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 8 },
    description: 'Captures student milestones (internships, study abroad) and work constraints for scheduling.',
    inputs: [
      { id: 'mc-in-distribution', name: 'distribution', type: 'SemesterAllocation[]' },
      { id: 'mc-in-studentType', name: 'studentType', type: 'string' },
    ],
    outputs: [
      { id: 'mc-out-milestones', name: 'milestones', type: 'Milestone[]' },
      { id: 'mc-out-workConstraints', name: 'workConstraints', type: '{ workStatus, additionalNotes }' },
    ],
  },
  {
    id: 'additional_concerns',
    name: 'Additional Concerns',
    toolType: 'additional_concerns',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 9 },
    description: 'Optional step to collect any additional student concerns, preferences, or special requirements.',
    isConditional: true,
    inputs: [
      { id: 'ac-in-context', name: 'conversationContext', type: 'ConversationState' },
    ],
    outputs: [
      { id: 'ac-out-concerns', name: 'additionalNotes', type: 'string' },
    ],
  },
  {
    id: 'generate_confirmation',
    name: 'Generate Plan Confirmation',
    toolType: 'generate_plan_confirmation',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 10 },
    description: 'Final confirmation before plan generation. User picks automatic or active-feedback mode and start term.',
    inputs: [
      { id: 'gc-in-academicTerms', name: 'academicTerms', type: 'AcademicTermsConfig' },
      { id: 'gc-in-lastTerm', name: 'lastCompletedTerm', type: 'string | null' },
    ],
    outputs: [
      { id: 'gc-out-action', name: 'action', type: "'generate' | 'review'" },
      { id: 'gc-out-mode', name: 'generationMode', type: "'automatic' | 'active_feedback'" },
      { id: 'gc-out-startTerm', name: 'startTerm', type: 'string' },
    ],
  },
  {
    id: 'active_feedback',
    name: 'Active Feedback Plan',
    toolType: 'active_feedback_plan',
    category: 'core',
    color: CATEGORY_COLORS.core,
    position: { x: CORE_X, y: 40 + Y_SPACING * 11 },
    description: 'Interactive plan builder where AI generates a draft term-by-term and student provides feedback.',
    inputs: [
      { id: 'af-in-courseData', name: 'courseData', type: 'CourseSelection[]' },
      { id: 'af-in-distribution', name: 'suggestedDistribution', type: 'SemesterAllocation[]' },
      { id: 'af-in-milestones', name: 'milestones', type: 'Milestone[]' },
      { id: 'af-in-workStatus', name: 'workStatus', type: 'string' },
    ],
    outputs: [
      { id: 'af-out-action', name: 'action', type: "'generate' | 'close'" },
      { id: 'af-out-draftPlan', name: 'draftPlan', type: 'DraftPlan' },
    ],
  },

  // ── Optional Branch ────────────────────────────────────────────────────────
  {
    id: 'career_suggestions',
    name: 'Career Suggestions',
    toolType: 'career_suggestions',
    category: 'optional',
    color: CATEGORY_COLORS.optional,
    position: { x: OPTIONAL_X, y: 40 },
    description: 'AI-powered career suggestions based on student interests and profile. Feeds into program selection.',
    isConditional: true,
    inputs: [
      { id: 'crs-in-interests', name: 'studentInterests', type: 'string' },
      { id: 'crs-in-careerGoals', name: 'careerGoals', type: 'string | null' },
    ],
    outputs: [
      { id: 'crs-out-career', name: 'selectedCareer', type: 'string' },
      { id: 'crs-out-careers', name: 'careerSuggestions', type: 'Career[]' },
    ],
  },
  {
    id: 'program_suggestions',
    name: 'Program Suggestions',
    toolType: 'program_suggestions',
    category: 'optional',
    color: CATEGORY_COLORS.optional,
    position: { x: OPTIONAL_X, y: 40 + Y_SPACING * 5 },
    description: 'AI suggests academic programs based on selected career and interests. Used during program selection.',
    isConditional: true,
    inputs: [
      { id: 'prs-in-career', name: 'selectedCareer', type: 'string' },
      { id: 'prs-in-interests', name: 'studentInterests', type: 'string' },
    ],
    outputs: [
      { id: 'prs-out-programs', name: 'suggestedPrograms', type: '{ programName, programType }[]' },
    ],
  },
  {
    id: 'course_recommendations',
    name: 'Course Recommendations',
    toolType: 'course_recommendations',
    category: 'optional',
    color: CATEGORY_COLORS.optional,
    position: { x: OPTIONAL_X, y: 40 + Y_SPACING * 6 },
    description: 'AI-powered course recommendations based on student interests, career goals, and program requirements.',
    isConditional: true,
    inputs: [
      { id: 'cr-in-programs', name: 'selectedPrograms', type: 'Program[]' },
      { id: 'cr-in-interests', name: 'studentInterests', type: 'string' },
      { id: 'cr-in-careerGoals', name: 'careerGoals', type: 'string' },
    ],
    outputs: [
      { id: 'cr-out-recommendations', name: 'recommendedCourses', type: 'Course[]' },
    ],
  },
];

// ─── Seed Edges ─────────────────────────────────────────────────────────────────

export const SEED_EDGES: ToolEdge[] = [
  // Core pipeline
  {
    id: 'e-student-profile',
    sourceNodeId: 'student_type',
    sourcePortId: 'st-out-studentType',
    targetNodeId: 'profile_check',
    targetPortId: 'pc-in-studentType',
    animationDelay: 0,
  },
  {
    id: 'e-profile-transcript',
    sourceNodeId: 'profile_check',
    sourcePortId: 'pc-out-studentType',
    targetNodeId: 'transcript_check',
    targetPortId: 'tc-in-hasCourses',
    animationDelay: 400,
  },
  {
    id: 'e-transcript-upload',
    sourceNodeId: 'transcript_check',
    sourcePortId: 'tc-out-wantsToUpload',
    targetNodeId: 'transcript_upload',
    targetPortId: 'tu-in-pdfFile',
    isConditional: true,
    label: 'if uploading',
    animationDelay: 800,
  },
  {
    id: 'e-upload-review',
    sourceNodeId: 'transcript_upload',
    sourcePortId: 'tu-out-courses',
    targetNodeId: 'transcript_review',
    targetPortId: 'tr-in-courses',
    isConditional: true,
    animationDelay: 1200,
  },
  {
    id: 'e-review-program',
    sourceNodeId: 'transcript_review',
    sourcePortId: 'tr-out-confirmed',
    targetNodeId: 'program_selection',
    targetPortId: 'ps-in-studentType',
    isConditional: true,
    animationDelay: 1600,
  },
  {
    id: 'e-transcript-program-skip',
    sourceNodeId: 'transcript_check',
    sourcePortId: 'tc-out-hasTranscript',
    targetNodeId: 'program_selection',
    targetPortId: 'ps-in-studentType',
    isConditional: true,
    label: 'if skipping upload',
    animationDelay: 800,
  },
  {
    id: 'e-program-course',
    sourceNodeId: 'program_selection',
    sourcePortId: 'ps-out-selectedPrograms',
    targetNodeId: 'course_selection',
    targetPortId: 'cs-in-programIds',
    animationDelay: 2000,
  },
  {
    id: 'e-course-credit',
    sourceNodeId: 'course_selection',
    sourcePortId: 'cs-out-totalCredits',
    targetNodeId: 'credit_distribution',
    targetPortId: 'cd-in-totalCredits',
    animationDelay: 2400,
  },
  {
    id: 'e-credit-milestones',
    sourceNodeId: 'credit_distribution',
    sourcePortId: 'cd-out-distribution',
    targetNodeId: 'milestones',
    targetPortId: 'mc-in-distribution',
    animationDelay: 2800,
  },
  {
    id: 'e-milestones-concerns',
    sourceNodeId: 'milestones',
    sourcePortId: 'mc-out-milestones',
    targetNodeId: 'additional_concerns',
    targetPortId: 'ac-in-context',
    isConditional: true,
    label: 'if has concerns',
    animationDelay: 3200,
  },
  {
    id: 'e-concerns-confirm',
    sourceNodeId: 'additional_concerns',
    sourcePortId: 'ac-out-concerns',
    targetNodeId: 'generate_confirmation',
    targetPortId: 'gc-in-academicTerms',
    isConditional: true,
    animationDelay: 3600,
  },
  {
    id: 'e-milestones-confirm-skip',
    sourceNodeId: 'milestones',
    sourcePortId: 'mc-out-milestones',
    targetNodeId: 'generate_confirmation',
    targetPortId: 'gc-in-academicTerms',
    label: 'if no concerns',
    animationDelay: 3200,
  },
  {
    id: 'e-confirm-feedback',
    sourceNodeId: 'generate_confirmation',
    sourcePortId: 'gc-out-action',
    targetNodeId: 'active_feedback',
    targetPortId: 'af-in-courseData',
    animationDelay: 4000,
  },

  // Data layer connections - infrastructure to core pipeline
  {
    id: 'e-fetchprograms-programselection',
    sourceNodeId: 'fetch_programs',
    sourcePortId: 'fp-out-programs',
    targetNodeId: 'program_selection',
    targetPortId: 'ps-in-universityId',
    label: 'program data',
    animationDelay: 1800,
  },
  {
    id: 'e-fetchofferings-courseselection',
    sourceNodeId: 'fetch_course_offerings',
    sourcePortId: 'fco-out-offerings',
    targetNodeId: 'course_selection',
    targetPortId: 'cs-in-programIds',
    label: 'course data',
    animationDelay: 2200,
  },

  // Data layer to optional tools
  {
    id: 'e-fetchprograms-programsuggestions',
    sourceNodeId: 'fetch_programs',
    sourcePortId: 'fp-out-programs',
    targetNodeId: 'program_suggestions',
    targetPortId: 'prs-in-career',
    isConditional: true,
    label: 'available programs',
    animationDelay: 1000,
  },
  {
    id: 'e-fetchofferings-courserecommendations',
    sourceNodeId: 'fetch_course_offerings',
    sourcePortId: 'fco-out-offerings',
    targetNodeId: 'course_recommendations',
    targetPortId: 'cr-in-programs',
    isConditional: true,
    label: 'available courses',
    animationDelay: 2200,
  },

  // Vector search (hypothetical) connections
  {
    id: 'e-vector-programsuggestions',
    sourceNodeId: 'vector_search',
    sourcePortId: 'vs-out-results',
    targetNodeId: 'program_suggestions',
    targetPortId: 'prs-in-career',
    isConditional: true,
    label: 'semantic program match',
    animationDelay: 900,
  },
  {
    id: 'e-vector-courserecommendations',
    sourceNodeId: 'vector_search',
    sourcePortId: 'vs-out-results',
    targetNodeId: 'course_recommendations',
    targetPortId: 'cr-in-programs',
    isConditional: true,
    label: 'semantic course match',
    animationDelay: 2100,
  },
  {
    id: 'e-vector-careersuggestions',
    sourceNodeId: 'vector_search',
    sourcePortId: 'vs-out-results',
    targetNodeId: 'career_suggestions',
    targetPortId: 'crs-in-interests',
    isConditional: true,
    label: 'semantic career match',
    animationDelay: 100,
  },

  // Optional branch - Career & Program Suggestions
  {
    id: 'e-profile-career',
    sourceNodeId: 'profile_check',
    sourcePortId: 'pc-out-careerGoals',
    targetNodeId: 'career_suggestions',
    targetPortId: 'crs-in-interests',
    isConditional: true,
    label: 'if interests provided',
    animationDelay: 200,
  },
  {
    id: 'e-career-programs',
    sourceNodeId: 'career_suggestions',
    sourcePortId: 'crs-out-career',
    targetNodeId: 'program_suggestions',
    targetPortId: 'prs-in-career',
    isConditional: true,
    animationDelay: 600,
  },
  {
    id: 'e-suggestions-selection',
    sourceNodeId: 'program_suggestions',
    sourcePortId: 'prs-out-programs',
    targetNodeId: 'program_selection',
    targetPortId: 'ps-in-studentType',
    isConditional: true,
    label: 'suggested programs',
    animationDelay: 1000,
  },

  // Optional branch - Course Recommendations
  {
    id: 'e-program-recommendations',
    sourceNodeId: 'program_selection',
    sourcePortId: 'ps-out-selectedPrograms',
    targetNodeId: 'course_recommendations',
    targetPortId: 'cr-in-programs',
    isConditional: true,
    label: 'AI recommendations',
    animationDelay: 1800,
  },
  {
    id: 'e-recommendations-course',
    sourceNodeId: 'course_recommendations',
    sourcePortId: 'cr-out-recommendations',
    targetNodeId: 'course_selection',
    targetPortId: 'cs-in-programIds',
    isConditional: true,
    animationDelay: 2200,
  },
];

// ─── Initial Graph State ────────────────────────────────────────────────────────

export const INITIAL_GRAPH: FlowGraph = {
  nodes: SEED_NODES,
  edges: SEED_EDGES,
  selectedNodeId: null,
  isAnimating: false,
  activeEdgeIndex: -1,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
};
