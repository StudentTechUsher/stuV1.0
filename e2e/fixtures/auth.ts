import { Page } from '@playwright/test';
import { TEST_USER, TEST_URLS, SELECTORS } from './test-data';

/**
 * Authentication helper utilities for E2E tests
 */

/**
 * Performs login with test credentials
 * @param page - Playwright page object
 * @param email - User email (defaults to TEST_USER.email)
 * @param password - User password (defaults to TEST_USER.password)
 */
export async function login(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
): Promise<void> {
  // Navigate to login page
  await page.goto(TEST_URLS.login);

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Show password authentication form
  await showPasswordAuth(page);

  // Fill in credentials
  await page.fill(SELECTORS.emailInput, email);
  await page.fill(SELECTORS.passwordInput, password);

  // Submit the form
  await page.click(SELECTORS.loginButton);

  // Wait for navigation to complete - wait for dashboard or any non-login/non-auth page
  await page.waitForURL(
    (url) => {
      const path = url.pathname;
      return !path.includes('/login') && !path.includes('/auth/signin');
    },
    { timeout: 15000 }
  );

  // Wait for page to be fully loaded after redirect
  await page.waitForLoadState('networkidle');
}

/**
 * Performs logout
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Click logout button if it exists
  const logoutButton = page.locator(SELECTORS.logoutButton);

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    // Wait for redirect to login or home page
    await page.waitForURL((url) =>
      url.pathname.includes('/auth/signin') || url.pathname === '/'
    );
  }
}

/**
 * Performs signup with test credentials
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 * @param firstName - User first name
 * @param lastName - User last name
 */
export async function signup(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password,
  firstName: string = TEST_USER.firstName,
  lastName: string = TEST_USER.lastName
): Promise<void> {
  // Navigate to signup page
  await page.goto(TEST_URLS.signup);

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Fill in signup form
  // Note: Adjust selectors based on actual signup form fields
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Fill first and last name if fields exist
  const firstNameInput = page.locator('input[name="firstName"]');
  if (await firstNameInput.isVisible()) {
    await firstNameInput.fill(firstName);
  }

  const lastNameInput = page.locator('input[name="lastName"]');
  if (await lastNameInput.isVisible()) {
    await lastNameInput.fill(lastName);
  }

  // Submit the form
  await page.click(SELECTORS.signupButton);

  // Wait for successful signup (redirect or confirmation)
  await page.waitForLoadState('networkidle');
}

/**
 * Checks if user is authenticated
 * @param page - Playwright page object
 * @returns True if user is authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for authenticated state indicators
  // This could be presence of user menu, logout button, or authenticated routes
  const logoutButton = page.locator(SELECTORS.logoutButton);

  try {
    await logoutButton.waitFor({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets test user credentials from environment
 * @returns Test user credentials
 */
export function getTestCredentials(): {
  email: string;
  password: string;
} {
  return {
    email: TEST_USER.email,
    password: TEST_USER.password,
  };
}

/**
 * Waits for authentication redirect to complete
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForAuthRedirect(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(
    (url) => !url.pathname.includes('/auth'),
    { timeout }
  );
}

/**
 * Ensures user is on the login page
 * @param page - Playwright page object
 */
export async function ensureOnLoginPage(page: Page): Promise<void> {
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    await page.goto(TEST_URLS.login);
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Shows the password authentication form on login page
 * @param page - Playwright page object
 */
export async function showPasswordAuth(page: Page): Promise<void> {
  // Check if password field is already visible
  const passwordField = page.locator(SELECTORS.passwordInput);
  const isVisible = await passwordField.isVisible().catch(() => false);

  if (!isVisible) {
    // Click the "Sign in with password" toggle
    await page.click('button:has-text("Sign in with password")');
    // Wait for password field to appear
    await page.waitForSelector(SELECTORS.passwordInput, { state: 'visible' });
  }
}

/**
 * Verifies authentication error message
 * @param page - Playwright page object
 * @param expectedMessage - Expected error message (partial match)
 */
export async function verifyAuthError(
  page: Page,
  expectedMessage: string
): Promise<boolean> {
  const errorElement = page.locator(SELECTORS.errorMessage);
  const errorText = await errorElement.textContent();
  return errorText?.includes(expectedMessage) ?? false;
}
