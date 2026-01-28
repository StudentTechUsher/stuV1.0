import { test, expect } from '@playwright/test';
import {
  login,
  logout,
  isAuthenticated,
  ensureOnLoginPage,
  showPasswordAuth,
  verifyAuthError,
} from './fixtures/auth';
import { TEST_USER, TEST_URLS, SELECTORS } from './fixtures/test-data';

test.describe('Authentication Flows', () => {
  test.describe('Login', () => {
    test('should successfully login with valid credentials', async ({
      page,
    }) => {
      // Navigate to login page
      await page.goto(TEST_URLS.login);

      // Perform login
      await login(page, TEST_USER.email, TEST_USER.password);

      // Verify we're no longer on the login page
      expect(page.url()).not.toContain('/login');

      // Verify we're on an authenticated route (dashboard, profile, etc.)
      const url = page.url();
      const isOnAuthenticatedRoute =
        url.includes('/dashboard') ||
        url.includes('/profile') ||
        url.includes('/grad-plan') ||
        url.includes('/transcript');
      expect(isOnAuthenticatedRoute).toBe(true);
    });

    test('should show error with invalid email', async ({ page }) => {
      await ensureOnLoginPage(page);
      await showPasswordAuth(page);

      // Attempt login with invalid email
      await page.fill(SELECTORS.emailInput, 'invalid@example.com');
      await page.fill(SELECTORS.passwordInput, TEST_USER.password);
      await page.click(SELECTORS.loginButton);

      // Wait for error message
      await page.waitForSelector(SELECTORS.errorMessage, { timeout: 5000 });

      // Verify error is displayed
      const errorVisible = await page.locator(SELECTORS.errorMessage).isVisible();
      expect(errorVisible).toBe(true);
    });

    test('should show error with invalid password', async ({ page }) => {
      await ensureOnLoginPage(page);
      await showPasswordAuth(page);

      // Attempt login with invalid password
      await page.fill(SELECTORS.emailInput, TEST_USER.email);
      await page.fill(SELECTORS.passwordInput, 'WrongPassword123!');
      await page.click(SELECTORS.loginButton);

      // Wait for error message
      await page.waitForSelector(SELECTORS.errorMessage, { timeout: 5000 });

      // Verify error is displayed
      const errorVisible = await page.locator(SELECTORS.errorMessage).isVisible();
      expect(errorVisible).toBe(true);
    });

    test('should validate required fields', async ({ page }) => {
      await ensureOnLoginPage(page);

      // Try to submit without filling fields
      await page.click(SELECTORS.loginButton);

      // Check for validation messages
      const emailInput = page.locator(SELECTORS.emailInput);
      const passwordInput = page.locator(SELECTORS.passwordInput);

      // Check if HTML5 validation is triggered or custom validation messages appear
      const emailInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );
      const passwordInvalid = await passwordInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );

      expect(emailInvalid || passwordInvalid).toBe(true);
    });
  });

  test.describe('Logout', () => {
    test('should successfully logout', async ({ page }) => {
      // Start from authenticated state (using storageState from setup)
      await page.goto(TEST_URLS.home);

      // Verify we're authenticated
      const authenticatedBefore = await isAuthenticated(page);
      expect(authenticatedBefore).toBe(true);

      // Perform logout
      await logout(page);

      // Verify we're logged out (either on login page or home)
      const currentUrl = page.url();
      const isLoggedOut =
        currentUrl.includes('/login') || currentUrl === TEST_URLS.home;
      expect(isLoggedOut).toBe(true);
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page reload', async ({ page }) => {
      // Navigate to a protected route
      await page.goto(TEST_URLS.dashboard);

      // Verify authenticated
      const authenticatedBefore = await isAuthenticated(page);
      expect(authenticatedBefore).toBe(true);

      // Reload the page
      await page.reload();

      // Verify still authenticated
      const authenticatedAfter = await isAuthenticated(page);
      expect(authenticatedAfter).toBe(true);

      // Verify we're still on the dashboard
      expect(page.url()).toContain(TEST_URLS.dashboard);
    });

    test('should redirect to login when accessing protected route without auth', async ({
      page,
      context,
    }) => {
      // Clear storage to simulate unauthenticated state
      await context.clearCookies();
      await context.clearPermissions();

      // Try to access protected route
      await page.goto(TEST_URLS.gradPlan);

      // Should be redirected to login
      await page.waitForURL((url) => url.pathname.includes('/login'), {
        timeout: 10000,
      });

      expect(page.url()).toContain('/login');
    });
  });

  test.describe('OAuth Flow', () => {
    test.skip('should handle OAuth authorization callback', async ({
      page,
    }) => {
      // This test is skipped as it requires OAuth provider integration
      // Implement when OAuth is fully configured

      // Navigate to OAuth login
      await page.goto('/login');

      // Click OAuth provider button (e.g., Google)
      // await page.click('[data-testid="oauth-google"]');

      // Handle OAuth redirect and callback
      // This would require OAuth test credentials or mock server
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);

      await ensureOnLoginPage(page);
      await showPasswordAuth(page);

      // Try to login
      await page.fill(SELECTORS.emailInput, TEST_USER.email);
      await page.fill(SELECTORS.passwordInput, TEST_USER.password);
      await page.click(SELECTORS.loginButton);

      // Wait for error message or indication
      await page.waitForTimeout(2000);

      // Re-enable network
      await page.context().setOffline(false);
    });

    test('should handle empty credentials', async ({ page }) => {
      await ensureOnLoginPage(page);
      await showPasswordAuth(page);

      // Try to login with empty credentials
      await page.fill(SELECTORS.emailInput, '');
      await page.fill(SELECTORS.passwordInput, '');
      await page.click(SELECTORS.loginButton);

      // Verify form validation prevents submission
      // Should still be on login page
      expect(page.url()).toContain('/login');
    });
  });
});
