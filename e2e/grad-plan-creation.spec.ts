import { test, expect } from '@playwright/test';
import { TEST_URLS } from './fixtures/test-data';

/**
 * Test for complete graduation plan creation workflow
 * This test walks through the entire onboarding and plan generation process
 */
test.describe('Graduation Plan Creation', () => {

  test('should create a complete graduation plan from scratch', async ({ page }) => {
    // Navigate to home page (already authenticated from setup)
    await page.goto('/');

    // Note: Login steps are already handled by auth.setup.ts
    // The session is reused, so we skip the login steps from codegen

    // Navigate to grad plan page
    await page.getByRole('link').nth(3).click();

    // Click create new plan
    await page.getByRole('button', { name: 'Create New Plan' }).click();

    // ===== STEP 1: Edit Settings =====
    await page.getByRole('button', { name: 'Edit Settings' }).click();

    // Select semester
    await page.getByText('Winter').click();
    await page.getByRole('option', { name: 'Fall' }).click();

    // Set graduation year
    await page.getByRole('spinbutton', { name: 'Estimated Graduation Year' }).click();
    await page.getByRole('spinbutton', { name: 'Estimated Graduation Year' }).fill('2031');

    // Set admission year
    await page.getByRole('spinbutton', { name: 'Admission Year' }).click();
    await page.getByRole('spinbutton', { name: 'Admission Year' }).fill('2024');

    // Select admission type (transferred)
    await page.getByText('I was admitted as a freshman').click();
    await page.getByRole('option', { name: 'I transferred from another' }).click();

    // Set career goal
    await page.getByRole('textbox', { name: 'e.g., Software Engineer, Data' }).click();
    await page.getByRole('textbox', { name: 'e.g., Software Engineer, Data' }).fill('Software Engineer Person');

    // Save settings
    await page.getByRole('button', { name: 'Save & Continue' }).click();

    // ===== STEP 2: Program Selection =====
    await page.getByRole('button', { name: 'Continue to Program Selection' }).click();

    // Skip transcript upload
    await page.getByRole('button', { name: 'Continue without transcript' }).click();

    // Select major (Accounting)
    await page.getByRole('combobox', { name: 'Search for majors...' }).click();
    await page.getByText('Accounting (BS)', { exact: true }).click();

    // Continue with selected major
    await page.getByRole('button', { name: 'Continue with Selected' }).click();

    // Use "I'm feeling lucky" for course selection
    await page.getByRole('button', { name: 'I\'m feeling lucky' }).click();

    // Continue through steps
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Submit & Continue' }).click();

    // ===== STEP 3: Term Configuration =====
    // Toggle spring and summer terms
    await page.getByText('Spring TermLighter session').click();
    await page.getByText('Summer TermLighter session').click();

    // Continue to milestones
    await page.getByRole('button', { name: 'Continue to Milestones &' }).click();

    // ===== STEP 4: Add Milestone (Internship) =====
    await page.getByText('Internship').click();
    await page.getByText('Before Last Year').click();
    await page.getByRole('button', { name: 'Add' }).click();

    // Continue to plan generation
    await page.getByRole('button', { name: 'Continue to Plan Generation' }).click();

    // ===== STEP 5: Generate Plan =====
    await page.getByRole('button', { name: 'Automatic Generation Generate' }).click();
    await page.getByRole('button', { name: 'Generate Plan' }).click();

    // Wait for plan generation and navigation
    await page.waitForURL(/\/grad-plan\/.*/, { timeout: 30000 });

    // ===== STEP 6: Name the Plan =====
    await page.getByRole('textbox', { name: 'Plan name' }).click();
    await page.getByRole('textbox', { name: 'Plan name' }).fill('Test Plan');

    // ===== VERIFICATION =====
    // Verify plan was created with the correct name
    await expect(page.locator('text=Test Plan')).toBeVisible();

    // Verify we're on the grad plan detail page
    expect(page.url()).toContain('/grad-plan/');
  });

});
