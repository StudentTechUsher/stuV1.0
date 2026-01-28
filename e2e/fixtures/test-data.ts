/**
 * Test data constants for E2E tests
 *
 * IMPORTANT: All data here is synthetic test data only.
 * NEVER use real student information for FERPA compliance.
 */

/**
 * Test user credentials
 * These should match the E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables
 */
export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e-test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
} as const;

/**
 * Test URLs for navigation
 */
export const TEST_URLS = {
  home: '/',
  login: '/login',
  signup: '/signup',
  gradPlan: '/grad-plan',
  transcript: '/transcript',
  profile: '/profile',
  dashboard: '/dashboard',
} as const;

/**
 * Test timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
  navigation: 15000,
} as const;

/**
 * Sample course data for testing
 */
export const SAMPLE_COURSES = {
  introToProgramming: {
    code: 'CS 101',
    name: 'Introduction to Programming',
    credits: 3,
    grade: 'A',
  },
  dataStructures: {
    code: 'CS 201',
    name: 'Data Structures',
    credits: 3,
    grade: 'B+',
  },
  algorithms: {
    code: 'CS 301',
    name: 'Algorithms',
    credits: 3,
    grade: 'A-',
  },
} as const;

/**
 * Sample graduation plan data
 */
export const SAMPLE_GRAD_PLAN = {
  title: 'Computer Science Degree Plan',
  description: 'E2E Test Graduation Plan',
  expectedGraduation: '2026-05',
} as const;

/**
 * Test selectors for common UI elements
 * Using data-testid for stable selection
 */
export const SELECTORS = {
  // Auth
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  loginButton: 'button[type="submit"]',
  signupButton: 'button[type="submit"]',
  logoutButton: '[data-testid="logout-button"]',

  // Navigation
  navHome: '[href="/"]',
  navGradPlan: '[href="/grad-plan"]',
  navTranscript: '[href="/transcript"]',
  navProfile: '[href="/profile"]',

  // Forms
  submitButton: 'button[type="submit"]',
  cancelButton: 'button[type="button"]',

  // Common
  loadingSpinner: '[data-testid="loading"]',
  errorMessage: '[role="alert"]',
  successMessage: '[data-testid="success-message"]',
} as const;

/**
 * Test file paths for uploads
 */
export const TEST_FILES = {
  sampleTranscript: 'e2e/fixtures/sample-transcript.pdf',
} as const;
